import type { Prisma } from "@prisma/client";

export { prisma } from "./prisma";
export * from "@prisma/client";

// Export validation schemas
export * from "./schema";

// Helpful aliases that stay in sync with Prisma-generated types
export type PostWithAuthor = Prisma.PostGetPayload<{ include: { user: true } }>;
