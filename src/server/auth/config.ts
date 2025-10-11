import { PrismaAdapter } from "@auth/prisma-adapter";
import type { DefaultSession, NextAuthConfig, JWT } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import { Resend } from "next-auth/providers/resend";
import { z } from "zod";

import { env } from "~/env";
import { verifyPassword } from "~/server/auth/password";
import { db } from "~/server/db";
import { logAuthEvent, logSecurityEvent, handleAuthError } from "~/lib/auth-errors";
import { ProjectRole, PermissionAction } from "~/lib/permissions";

/**
 * 获取用户的项目权限映射
 */
async function getUserProjectPermissions(userId: string): Promise<Record<string, ProjectPermissions>> {
  try {
    const memberships = await db.projectMember.findMany({
      where: {
        userId,
        role: {
          not: ProjectRole.NO_ACCESS,
        },
      },
      include: {
        project: {
          select: {
            id: true,
          },
        },
      },
    });

    const permissions: Record<string, ProjectPermissions> = {} as Record<string, ProjectPermissions>;

    // 角色权限映射
    const ROLE_PERMISSIONS: Record<ProjectRole, PermissionAction[]> = {
      [ProjectRole.OWNER]: [
        PermissionAction.READ,
        PermissionAction.CREATE,
        PermissionAction.UPDATE,
        PermissionAction.DELETE,
        PermissionAction.MANAGE,
      ],
      [ProjectRole.ADMIN]: [
        PermissionAction.READ,
        PermissionAction.CREATE,
        PermissionAction.UPDATE,
        PermissionAction.DELETE,
      ],
      [ProjectRole.EDITOR]: [
        PermissionAction.READ,
        PermissionAction.CREATE,
        PermissionAction.UPDATE,
      ],
      [ProjectRole.VIEWER]: [PermissionAction.READ],
      [ProjectRole.NO_ACCESS]: [],
    };

    for (const membership of memberships) {
      permissions[membership.project.id] = {
        role: membership.role as ProjectRole,
        inherited: ROLE_PERMISSIONS[membership.role as ProjectRole],
      };
    }

    return permissions;
  } catch (error) {
    console.error("Error getting user project permissions:", error);
    return {};
  }
}

/**
 * 权限映射接口
 */
interface ProjectPermissions {
  role: ProjectRole;
  inherited: PermissionAction[];
}

/**
 * 扩展的 JWT 接口，包含项目权限信息
 */
interface ExtendedJWT {
  sub?: string;
  effectivePermissions?: Record<string, ProjectPermissions>;
  [key: string]: any;
}

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * and JWT objects and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
    effectivePermissions?: Record<string, ProjectPermissions>;
  }

  interface JWT extends ExtendedJWT {}
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
	// Enable debug mode in development
	debug: process.env.NODE_ENV === "development",

	// Custom logger for authentication events
	logger: {
		error(code, metadata) {
			logAuthEvent("AUTH_ERROR", { code, metadata }, "error");
		},
		warn(code, metadata) {
			logAuthEvent("AUTH_WARNING", { code, metadata }, "warn");
		},
		debug(code, metadata) {
			if (process.env.NODE_ENV === "development") {
				logAuthEvent("AUTH_DEBUG", { code, metadata });
			}
		},
	},

	adapter: PrismaAdapter(db),
	session: {
		strategy: "jwt",
		maxAge: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 4, // refresh token every 4 hours at most
	},
	pages: {
		error: "/auth/error", // Custom error page
		signIn: "/auth/signin", // Custom sign in page
	},
	providers: [
		GitHubProvider({
			clientId: env.AUTH_GITHUB_ID,
			clientSecret: env.AUTH_GITHUB_SECRET,
		}),
		Resend({
			apiKey: env.AUTH_RESEND_KEY,
			from: env.AUTH_EMAIL,
		}),
		CredentialsProvider({
			name: "credentials",
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" },
			},
			async authorize(credentials) {
				try {
					const parsedCredentials = z
						.object({
							email: z.string().email(),
							password: z.string().min(6)
						})
						.safeParse(credentials);

					if (!parsedCredentials.success) {
						logSecurityEvent("INVALID_CREDENTIALS_FORMAT", {
							email: credentials.email
						});
						return null;
					}

					const { email, password } = parsedCredentials.data;

					// Log sign in attempt
					logAuthEvent("SIGN_IN_ATTEMPT", { email });

					const user = await db.user.findUnique({
						where: { email },
					});

					if (!user) {
						logSecurityEvent("SIGN_IN_FAILED_USER_NOT_FOUND", { email });
						return null;
					}

					if (!user.password) {
						logSecurityEvent("SIGN_IN_FAILED_NO_PASSWORD", {
							email,
							userId: user.id
						});
						return null;
					}

					const passwordsMatch = await verifyPassword(password, user.password);

					if (!passwordsMatch) {
						logSecurityEvent("SIGN_IN_FAILED_INVALID_PASSWORD", {
							email,
							userId: user.id
						});
						return null;
					}

					// Log successful sign in
					logAuthEvent("SIGN_IN_SUCCESS", {
						email,
						userId: user.id,
						provider: "credentials"
					});

					return {
						id: user.id,
						email: user.email,
						name: user.name,
						image: user.image,
					};
				} catch (error) {
					const authError = handleAuthError(error);
					logAuthEvent("CREDENTIALS_PROVIDER_ERROR", {
						error: authError.message,
						code: authError.code
					}, "error");
					return null;
				}
			},
		}),
	],
	callbacks: {
		session: ({ session, token }) => {
			if (session.user && token.sub) {
				session.user.id = token.sub;
			}
			// 添加项目权限信息到 session
			if (token.effectivePermissions) {
				session.effectivePermissions = token.effectivePermissions;
			}
			return session;
		},
		jwt: async ({ token, user, trigger }) => {
			if (user) {
				token.sub = user.id;
				// 在登录时获取项目权限
				token.effectivePermissions = await getUserProjectPermissions(user.id);
			} else if (trigger === "update" && token.sub) {
				// 在会话更新时刷新权限
				token.effectivePermissions = await getUserProjectPermissions(token.sub);
			}
			return token;
		},
		signIn: async ({ user, account, profile, email, credentials }) => {
			// Log successful authentication
			logAuthEvent("AUTH_SUCCESS", {
				userId: user?.id,
				email: user?.email,
				provider: account?.provider,
				isNewUser: !!user?.emailVerified,
			});
			return true;
		},
	},
} satisfies NextAuthConfig;
