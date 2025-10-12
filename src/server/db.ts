import { PrismaClient } from "@prisma/client";

import { env } from "~/env";
import { createEnvironmentMiddleware } from "~/server/db-middleware";

const createPrismaClient = () => {
	const prisma = new PrismaClient({
		log:
			env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
	});

	// 应用ID生成中间件
	return createEnvironmentMiddleware(prisma, env.NODE_ENV);
};

const globalForPrisma = globalThis as unknown as {
	prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

// Export prisma client directly for compatibility
export const prisma = db;

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
