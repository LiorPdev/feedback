import { drizzle } from 'drizzle-orm/d1';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import * as schema from './schema';

/**
 * Gets the Drizzle database client via Cloudflare D1.
 * - In production: uses the D1 binding from Cloudflare Workers
 * - In local dev (npm run dev): uses the local D1 via miniflare,
 *   initialized by initOpenNextCloudflareForDev() in next.config.ts
 */
export const getDb = async () => {
    const { env } = await getCloudflareContext({ async: true }) as any;
    if (!env?.DB) {
        throw new Error("D1 database binding (DB) not found in Cloudflare context.");
    }
    return drizzle(env.DB, { schema });
}