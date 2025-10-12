import { faker } from "@faker-js/faker";

export interface TestUser {
	id?: string;
	email: string;
	name: string;
	password: string; // 明文密码，用于测试
	passwordHash: string;
	emailVerified?: Date;
	image?: string;
}

export interface TestProject {
	id?: string;
	name: string;
	slug: string;
	description?: string;
	visibility: "PRIVATE" | "PUBLIC";
	createdAt?: Date;
	updatedAt?: Date;
	ownerId?: string;
}

export class TestDataFactory {
	/**
	 * 创建测试用户数据
	 */
	static createTestUser(overrides: Partial<TestUser> = {}): TestUser {
		const password = faker.internet.password({ length: 12, memorable: false });
		return {
			email: faker.internet.email({
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
				provider: "gmail.com",
			}),
			name: faker.person.fullName(),
			password,
			passwordHash: `hashed_${password}`,
			emailVerified: faker.date.past(),
			image: faker.image.avatar(),
			...overrides,
		};
	}

	/**
	 * 创建测试项目数据
	 */
	static createTestProject(overrides: Partial<TestProject> = {}): TestProject {
		const baseName = faker.company.name();
		const slug = baseName
			.toLowerCase()
			.replace(/[^a-z0-9]/g, "-")
			.replace(/-+/g, "-")
			.replace(/^-|-$/g, "");

		return {
			name: baseName,
			slug: slug,
			description: faker.lorem.sentence(),
			visibility: "PRIVATE",
			createdAt: faker.date.recent(),
			updatedAt: faker.date.recent(),
			...overrides,
		};
	}

	/**
	 * 创建批量测试用户
	 */
	static createTestUsers(
		count: number,
		overrides: Partial<TestUser> = {},
	): TestUser[] {
		return Array.from({ length: count }, () => this.createTestUser(overrides));
	}

	/**
	 * 创建批量测试项目
	 */
	static createTestProjects(
		count: number,
		ownerId: string,
		overrides: Partial<TestProject> = {},
	): TestProject[] {
		return Array.from({ length: count }, () =>
			this.createTestProject({ ownerId, ...overrides }),
		);
	}

	/**
	 * 创建有效的项目slug
	 */
	static createValidSlug(name: string): string {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, "")
			.replace(/\s+/g, "-")
			.replace(/-+/g, "-")
			.replace(/^-|-$/g, "");
	}

	/**
	 * 创建测试用的认证令牌
	 */
	static createTestToken(): string {
		return `test_token_${faker.string.uuid()}`;
	}

	/**
	 * 创建会话数据
	 */
	static createTestSession(userId: string, overrides: Partial<any> = {}) {
		return {
			id: faker.string.uuid(),
			sessionToken: faker.string.uuid(),
			userId,
			expires: faker.date.future(),
			...overrides,
		};
	}

	/**
	 * 创建登录请求数据
	 */
	static createLoginRequest(
		overrides: Partial<{
			email: string;
			passwordHash: string;
			rememberMe: boolean;
		}> = {},
	) {
		return {
			email: faker.internet.email(),
			passwordHash: faker.internet.password({ length: 12 }),
			rememberMe: faker.datatype.boolean(),
			...overrides,
		};
	}

	/**
	 * 创建无效登录请求数据 (用于错误测试)
	 */
	static createInvalidLoginRequest(
		type:
			| "missing_email"
			| "invalid_email"
			| "short_password"
			| "missing_password" = "invalid_email",
	) {
		const base = this.createLoginRequest();

		switch (type) {
			case "missing_email":
				// Return object with all required fields but invalid email
				return {
					email: "",
					passwordHash: base.passwordHash,
					rememberMe: base.rememberMe
				};
			case "invalid_email":
				return { ...base, email: "invalid-email" };
			case "short_password":
				return { ...base, passwordHash: "123" };
			case "missing_password":
				// Return object with all required fields but invalid password
				return {
					email: base.email,
					passwordHash: "",
					rememberMe: base.rememberMe
				};
			default:
				return base;
		}
	}

	/**
	 * 创建权限检查请求数据
	 */
	static createPermissionCheckRequest(
		overrides: Partial<{
			projectId: string;
			action: "read" | "write" | "delete" | "manage";
			resourceType: string;
		}> = {},
	) {
		return {
			projectId: faker.string.uuid(),
			action: faker.helpers.arrayElement(["read", "write", "delete", "manage"]),
			resourceType: faker.helpers.arrayElement([
				"project",
				"datamodel",
				"application",
				"deployment",
			]),
			...overrides,
		};
	}

	/**
	 * 创建批量权限检查请求数据
	 */
	static createBatchPermissionCheckRequest(
		count = 3,
		overrides: Partial<{
			projectId: string;
			action: string;
			resourceType: string;
		}> = {},
	) {
		return Array.from({ length: count }, (_, index) => ({
			projectId: faker.string.uuid(),
			action: faker.helpers.arrayElement(["read", "write", "delete", "manage"]),
			resourceType: faker.helpers.arrayElement([
				"project",
				"datamodel",
				"application",
				"deployment",
			]),
			...overrides,
		}));
	}

	/**
	 * 创建测试用的 JWT Payload
	 */
	static createTestJWTPayload(
		userId: string,
		overrides: Partial<{
			email: string;
			name: string;
			projectRoles: Record<string, string>;
			exp: number;
			iat: number;
		}> = {},
	) {
		const now = Math.floor(Date.now() / 1000);
		return {
			sub: userId,
			email: faker.internet.email(),
			name: faker.person.fullName(),
			projectRoles: {
				[faker.string.uuid()]: "OWNER",
				[faker.string.uuid()]: "ADMIN",
				[faker.string.uuid()]: "EDITOR",
				[faker.string.uuid()]: "VIEWER",
			},
			iat: now,
			exp: now + 3600, // 1小时后过期
			...overrides,
		};
	}

	/**
	 * 创建项目成员数据
	 */
	static createProjectMember(
		projectId: string,
		userId: string,
		role: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER" = "VIEWER",
		overrides: Partial<any> = {},
	) {
		return {
			id: faker.string.uuid(),
			projectId,
			userId,
			role,
			joinedAt: faker.date.past(),
			...overrides,
		};
	}

	/**
	 * 创建审计日志数据
	 */
	static createAuditLog(
		overrides: Partial<{
			action: string;
			resourceType: string;
			userId: string;
			metadata: Record<string, any>;
			ipAddress: string;
			userAgent: string;
		}> = {},
	) {
		return {
			id: faker.string.uuid(),
			action: faker.helpers.arrayElement([
				"SIGN_IN_ATTEMPT",
				"SIGN_IN_SUCCESS",
				"SIGN_IN_FAILED_INVALID_PASSWORD",
				"SIGN_IN_BLOCKED_ACCOUNT_LOCKED",
				"PERMISSION_CHECK_GRANTED",
				"PERMISSION_CHECK_DENIED",
			]),
			resourceType: faker.helpers.arrayElement([
				"AUTHENTICATION",
				"PROJECT",
				"APPLICATION",
				"USER",
			]),
			userId: faker.string.uuid(),
			metadata: {
				email: faker.internet.email(),
				projectId: faker.string.uuid(),
				...faker.helpers.arrayElement([
					{ loginMethod: "credentials", rememberMe: false },
					{ action: "read", resourceType: "project" },
					{ failedAttempts: 3, lockoutLevel: 1 },
				]),
			},
			ipAddress: faker.internet.ip(),
			userAgent: faker.internet.userAgent(),
			createdAt: faker.date.recent(),
			...overrides,
		};
	}

	/**
	 * 创建系统版本信息数据
	 */
	static createSystemVersionInfo(
		overrides: Partial<{
			name: string;
			version: string;
			buildNumber: string;
			environment: string;
		}> = {},
	) {
		return {
			system: {
				name: "FastBuild",
				version: "1.0.0",
				buildNumber: `build-${faker.number.int({ min: 1000, max: 9999 })}`,
				buildDate: faker.date.recent().toISOString(),
				environment: faker.helpers.arrayElement([
					"development",
					"staging",
					"production",
				]),
				region: faker.helpers.arrayElement([
					"us-east-1",
					"us-west-2",
					"eu-west-1",
				]),
				datacenter: faker.helpers.arrayElement([
					"aws-us-east-1a",
					"aws-us-west-2b",
				]),
				...overrides,
			},
			components: {
				api: {
					name: "FastBuild API",
					version: "1.0.0",
					status: faker.helpers.arrayElement([
						"healthy",
						"unhealthy",
						"degraded",
					]),
					lastUpdated: faker.date.recent().toISOString(),
				},
				database: {
					name: "PostgreSQL",
					version: "18.0",
					status: "connected",
					connectionInfo: {
						host: "localhost",
						port: 5432,
						database: "fastbuild_test",
					},
				},
				framework: {
					name: "Next.js",
					version: "15.5.4",
					runtime: `Node.js ${process.version}`,
				},
				dependencies: [],
			},
			features: {
				auth: {
					enabled: true,
					providers: ["credentials", "github"],
					jwtEnabled: true,
				},
				permissions: {
					system: "hardcoded",
					cacheEnabled: true,
					batchCheckEnabled: true,
				},
				monitoring: {
					healthChecks: true,
					auditLogging: true,
					metricsCollection: false,
				},
				security: {
					rateLimiting: true,
					ipTracking: true,
					auditTrail: true,
				},
			},
			metadata: {
				startupTime: faker.date.recent().toISOString(),
				uptime: faker.number.int({ min: 3600, max: 86400 }),
				deploymentId: faker.string.uuid(),
				gitCommit: faker.git.commitSha(),
				gitBranch: faker.helpers.arrayElement([
					"main",
					"develop",
					"feature/test",
				]),
			},
			links: {
				documentation: "/docs",
				apiDocs: "/api/docs",
				statusPage: "https://status.fastbuild.dev",
				support: "mailto:support@fastbuild.dev",
			},
		};
	}
}
