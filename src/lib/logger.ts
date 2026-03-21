import { getDb } from './db';
import { logs } from './schema';

/**
 * Logs a message to the database.
 * This is designed to be used in server-side contexts (Server Actions, Server Components, API Routes).
 */
export async function logToDb({
    message,
    data,
    source,
    userId,
}: {
    message: string;
    data?: any;
    source?: string;
    userId?: string;
}) {
    try {
        // In development, also log to console for visibility
        if (process.env.NODE_ENV === 'development') {
            console.log(`[DB LOG] ${source ? `(${source}) ` : ''}${message}`, data || '');
        }

        const db = await getDb();
        await db.insert(logs).values({
            message,
            data: data ? (typeof data === 'string' ? data : JSON.stringify(data)) : null,
            source,
            userId,
        });
    } catch (error) {
        // Fallback to console if DB logging fails
        console.error("Critical: Failed to log to DB:", error);
        console.error("Original Log Attempt:", { message, data, source, userId });
    }
}
