/**
 * Prisma DB client stub for FASE 1.
 * Will be replaced in FASE 2 after schema models are defined and
 * `prisma generate` is run — at that point import from "../generated/prisma".
 */

// Placeholder type until FASE 2 generates the real client
type DbClient = Record<string, never>;

const globalForPrisma = globalThis as unknown as { prisma: DbClient | undefined };

// TODO FASE 2: replace with `new PrismaClient()` from "../generated/prisma"
export const db: DbClient = globalForPrisma.prisma ?? ({} as DbClient);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
