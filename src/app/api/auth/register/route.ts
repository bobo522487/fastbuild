import { NextResponse } from "next/server";
import { z } from "zod";

import { hashPassword } from "~/lib/auth";
import { db } from "~/server/db";

const registerSchema = z.object({
	email: z.string().email(),
	password: z.string().min(6),
	name: z.string().optional(),
});

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const { email, password, name } = registerSchema.parse(body);

		// Check if user already exists
		const existingUser = await db.user.findUnique({
			where: { email },
		});

		if (existingUser) {
			return NextResponse.json(
				{ error: "User already exists" },
				{ status: 400 }
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

		return NextResponse.json(
			{ message: "User created successfully", userId: user.id },
			{ status: 201 }
		);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Invalid input", details: error.errors },
				{ status: 400 }
			);
		}

		console.error("Registration error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}