import { PrismaClient } from './generated/client'
import { PrismaD1 } from '@prisma/adapter-d1'

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const getDb = (env: any) => {
    console.log("=== PRISMA INIT DEBUG ===");
    console.log("env.DB exists?", !!env?.DB);
    console.log("process.env.DATABASE_URL:", process.env.DATABASE_URL);
    
    // Cloudflare Production Environment
    if (env?.DB) {
        console.log("Using D1 Adapter");
        const adapter = new PrismaD1(env.DB)
        return new PrismaClient({ adapter })
    }

    // Local Debug Environment
    if (!process.env.DATABASE_URL) process.env.DATABASE_URL = "file:./prisma/dev.db";
    console.log("Using Better-SQLite3 Adapter (Prisma 7.x Syntax)");
    const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
    
    if (!globalForPrisma.prisma) {
        const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
        globalForPrisma.prisma = new PrismaClient({ adapter });
    }
    return globalForPrisma.prisma;
}