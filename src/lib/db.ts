import { PrismaClient } from './generated/client'
import { PrismaD1 } from '@prisma/adapter-d1'

const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * Gets the Prisma database client.
 * Now asynchronous to support dynamic imports of Edge-incompatible modules in local dev.
 */
export const getDb = async (env: any): Promise<PrismaClient> => {
    // 1. Cloudflare Production Environment (D1)
    if (env?.DB) {
        const adapter = new PrismaD1(env.DB)
        return new PrismaClient({ adapter })
    }

    // 2. Local Development (Node.js/Edge-dev)
    if (process.env.NODE_ENV !== 'production') {
        try {
            // Using dynamic import to ensure better-sqlite3 is not resolved statically by the Edge bundler
            const { PrismaBetterSqlite3 } = await import('@prisma/adapter-better-sqlite3');
            
            if (!process.env.DATABASE_URL) {
                process.env.DATABASE_URL = "file:./prisma/dev.db";
            }
            
            if (!globalForPrisma.prisma) {
                const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
                globalForPrisma.prisma = new PrismaClient({ adapter });
            }
            return globalForPrisma.prisma;
        } catch (e) {
            console.error("Local DB adapter error:", e);
        }
    }

    // 3. Fallback/Safety
    if (globalForPrisma.prisma) return globalForPrisma.prisma;
    
    throw new Error("Database not available in this environment. (D1 DB missing)");
}