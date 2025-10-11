import { NextResponse } from "next/server";
import { z } from "zod";

import { hashPassword } from "~/server/auth/password";
import { db } from "~/server/db";
import {
	AuthError,
	AuthErrorCode,
	UserExistsError,
	handleAuthError,
	createAuthResponse,
	logAuthEvent,
	validatePasswordStrength,
	logSecurityEvent
} from "~/lib/auth-errors";

const registerSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8),
	name: z.string().min(1).max(50).optional(),
});

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { email, password, name } = registerSchema.parse(body);

		// Log registration attempt
		logAuthEvent("REGISTRATION_ATTEMPT", { email });

		// Validate password strength
		const passwordValidation = validatePasswordStrength(password);
		if (!passwordValidation.isValid) {
			return NextResponse.json(
				createAuthResponse(
					false,
					null,
					new AuthError(`Password requirements not met: ${passwordValidation.errors.join(", ")}`, AuthErrorCode.INVALID_REQUEST, 400),
				),
				{ status: 400 }
			);
		}

		// Check if user already exists
		const existingUser = await db.user.findUnique({
			where: { email },
		});

		if (existingUser) {
			logSecurityEvent("REGISTRATION_FAILED_USER_EXISTS", { email });
			return NextResponse.json(
				createAuthResponse(
					false,
					null,
					new UserExistsError(email)
				),
				{ status: 409 }
			);
		}

		// Hash password and create user
		const hashedPassword = await hashPassword(password);
		const user = await db.user.create({
			data: {
				email,
				password: hashedPassword,
				name: name || null,
			},
		});

		// Log successful registration
		logAuthEvent("REGISTRATION_SUCCESS", {
			email,
			userId: user.id,
			name: user.name,
		});

		return NextResponse.json(
			createAuthResponse(
				true,
				{
					message: "User created successfully",
					userId: user.id
				}
			),
			{ status: 201 }
		);
	} catch (error) {
		const authError = handleAuthError(error);

		logAuthEvent("REGISTRATION_ERROR", {
			error: authError.message,
			code: authError.code,
		}, "error");

		return NextResponse.json(
			createAuthResponse(false, null, authError),
			{ status: authError.statusCode }
		);
	}
}
