import { PrismaClient, Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Prisma client with basic logging
const prismaClient = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'] as Prisma.LogLevel[],
});

// Set up event listeners for query logging (if events are enabled)
if (process.env.NODE_ENV !== 'production') {
  try {
    prismaClient.$on('query' as any, (event: any) => {
      // Lazy load logger only when needed
      try {
        const { createLogger } = require('@fastbuild/logger');
        const logger = createLogger({
          type: 'database',
          query: event.query?.substring(0, 100),
          duration: event.duration,
          params: event.params,
        });

        if (event.duration > 1000) {
          logger.warn({ duration: event.duration }, 'Slow Prisma query');
        } else {
          logger.debug({ duration: event.duration }, 'Prisma query executed');
        }
      } catch (loggerError) {
        console.warn('Failed to create logger for Prisma query:', loggerError);
      }
    });
  } catch (error) {
    // Event listeners might not be available in all environments
    console.warn('Failed to set up Prisma query logging:', error);
  }
}

export const prisma = globalForPrisma.prisma ?? prismaClient;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;