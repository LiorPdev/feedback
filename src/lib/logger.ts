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
    data?: unknown;
    source?: string;
    userId?: string;
}) {
    try {
        // In development, also log to console for visibility
        if (process.env.NODE_ENV === 'development') {
            const prefix = `[DB LOG] ${source ? `(${source}) ` : ''}${message}`;
            if (data !== undefined) {
                console.log(prefix, data);
            } else {
                console.log(prefix);
            }
        }

        const db = await getDb();
        
        // Custom replacer for JSON.stringify to handle Error objects (including nested ones)
        const errorReplacer = (_key: string, value: unknown) => {
            if (value instanceof Error) {
                return {
                    message: value.message,
                    stack: value.stack,
                    name: value.name,
                };
            }
            if (typeof value === 'function') {
                return '[Function]';
            }
            return value;
        };

        let serializedData = null;
        if (data !== undefined && data !== null) {
            if (typeof data === 'string') {
                serializedData = data;
            } else {
                try {
                    serializedData = JSON.stringify(data, errorReplacer);
                } catch (serializeError) {
                    serializedData = `[Serialization Error: ${serializeError instanceof Error ? serializeError.message : String(serializeError)}]`;
                }
            }
        }

        await db.insert(logs).values({
            message,
            data: serializedData,
            source,
            userId,
        });
    } catch (error) {
        // Fallback to console if DB logging fails
        // Use separate arguments to console.error to avoid string coercion of potential proxies
        console.error("Critical: Failed to log to DB:", error instanceof Error ? error.message : "Unknown error");
        console.error("Original Log Attempt message:", message);
        if (source) console.error("Source:", source);
        if (data) console.error("Data:", data);
    }
}
