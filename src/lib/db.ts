import { drizzle } from 'drizzle-orm/d1';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { users, songs, feedbacks, logs, creditCodes, listenEvents, usersRelations, songsRelations, feedbacksRelations, listenEventsRelations } from './schema';

const drizzleSchema = {
    users,
    songs,
    feedbacks,
    logs,
    creditCodes,
    listenEvents,
    usersRelations,
    songsRelations,
    feedbacksRelations,
    listenEventsRelations,
};

/**
 * Gets the Drizzle database client via Cloudflare D1.
 * - In production: uses the D1 binding from Cloudflare Workers
 * - In local dev (npm run dev): uses the local D1 via miniflare,
 *   initialized by initOpenNextCloudflareForDev() in next.config.ts
 */
export const getDb = async () => {
    const context = await getCloudflareContext({ async: true }) as unknown as { env: Record<string, unknown> };
    const env = context?.env;
    
    if (!env?.DB) {
        const availableKeys = env ? Object.keys(env).join(", ") : "none (env is undefined)";
        throw new Error(
            `D1 database binding (DB) not found in Cloudflare context. ` +
            `Available bindings/env keys: [${availableKeys}]. ` +
            `Check your wrangler.json or Cloudflare dashboard bindings.`
        );
    }
    return drizzle(env.DB, { schema: drizzleSchema });
}