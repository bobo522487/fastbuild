import { PrismaAdapter } from "@auth/prisma-adapter";
import type { DefaultSession, NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import { z } from "zod";

import { env } from "~/env";
import { verifyPassword } from "~/server/auth/password";
import { db } from "~/server/db";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
	interface Session extends DefaultSession {
		user: {
			id: string;
		} & DefaultSession["user"];
	}
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
	adapter: PrismaAdapter(db),
	session: {
		strategy: "jwt",
		maxAge: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 4, // refresh token every 4 hours at most
	},
	providers: [
		GitHubProvider({
			clientId: env.AUTH_GITHUB_ID,
			clientSecret: env.AUTH_GITHUB_SECRET,
		}),
		CredentialsProvider({
			name: "credentials",
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" },
			},
			async authorize(credentials) {
				const parsedCredentials = z
					.object({ email: z.string().email(), password: z.string().min(6) })
					.safeParse(credentials);

				if (parsedCredentials.success) {
					const { email, password } = parsedCredentials.data;
					const user = await db.user.findUnique({
						where: { email },
					});

					if (!user?.password) return null;

					const passwordsMatch = await verifyPassword(password, user.password);

					if (passwordsMatch) {
						return {
							id: user.id,
							email: user.email,
							name: user.name,
							image: user.image,
						};
					}
				}

				return null;
			},
		}),
	],
	callbacks: {
		session: ({ session, token }) => {
			if (session.user && token.sub) {
				session.user.id = token.sub;
			}
			return session;
		},
		jwt: ({ token, user }) => {
			if (user) {
				token.sub = user.id;
			}
			return token;
		},
	},
} satisfies NextAuthConfig;
