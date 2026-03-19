import { PrismaClient } from './generated/client'
import { PrismaD1 } from '@prisma/adapter-d1'
import { getCloudflareContext } from '@opennextjs/cloudflare'

/**
 * Gets the Prisma database client via Cloudflare D1.
 * - In production: uses the D1 binding from Cloudflare Workers
 * - In local dev (npm run dev): uses the local D1 via miniflare,
 *   initialized by initOpenNextCloudflareForDev() in next.config.ts
 */
export const getDb = async (): Promise<PrismaClient> => {
    const { env } = await getCloudflareContext({ async: true }) as any;
    if (!env?.DB) {
        throw new Error("D1 database binding (DB) not found in Cloudflare context.");
    }
    const adapter = new PrismaD1(env.DB);
    return new PrismaClient({ adapter });
}