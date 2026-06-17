import { Pool, type PoolConfig } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/**
 * TLS configuration for the Postgres connection.
 *
 * Supabase's pooler presents a certificate signed by a private CA
 * ("Supabase Intermediate 2021 CA"), which is NOT in the public trust store.
 * To verify the chain (and prevent MITM on the channel that carries all
 * multi-tenant data) the Supabase CA must be supplied via DATABASE_CA_CERT.
 *
 * - DATABASE_CA_CERT set  → full verification (rejectUnauthorized: true). Secure.
 * - not set, production    → encrypted but unverified, with a loud warning so the
 *                            operator adds the CA (avoids a hard outage on deploy).
 * - not set, dev/local     → unverified (local Postgres / docker, no public CA).
 */
function getSslConfig(): PoolConfig["ssl"] {
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n");
  if (ca) {
    return { ca, rejectUnauthorized: true };
  }
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[db] DATABASE_CA_CERT non impostato: connessione TLS NON verificata (MITM possibile). " +
        "Imposta DATABASE_CA_CERT con la CA di Supabase per la verifica completa del certificato.",
    );
  }
  return { rejectUnauthorized: false };
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString,
    ssl: getSslConfig(),
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
