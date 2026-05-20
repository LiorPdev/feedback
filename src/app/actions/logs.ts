import { logActionServer } from "./logs-server";

// Helper function to serialize errors and object properties securely before Server Action call
function serializeError(val: unknown): unknown {
    if (val === null || val === undefined) return val;

    if (val instanceof Error) {
        const errorObj: Record<string, unknown> = {
            name: val.name,
            message: val.message,
            stack: val.stack,
        };
        // Copy any custom enumerable properties
        for (const key of Object.keys(val)) {
            errorObj[key] = serializeError((val as unknown as Record<string, unknown>)[key]);
        }
        return errorObj;
    }

    if (Array.isArray(val)) {
        return val.map((item: unknown) => serializeError(item));
    }

    if (typeof val === "object") {
        const cleanObj: Record<string, unknown> = {};
        const objRecord = val as Record<string, unknown>;
        for (const [key, value] of Object.entries(objRecord)) {
            if (typeof value === "function") {
                cleanObj[key] = "[Function]";
            } else {
                cleanObj[key] = serializeError(value);
            }
        }
        return cleanObj;
    }

    if (typeof val === "function") {
        return "[Function]";
    }

    return val;
}

/**
 * Client-safe and Server-safe Logger wrapper.
 * Preprocesses non-serializable objects (like Errors and functions) on the caller side
 * before invoking the actual Server Action.
 */
export async function logAction(params: {
    message: string;
    data?: unknown;
    source?: string;
    userId?: string;
}) {
    // Process data to serialize any Errors or client-side non-serializable objects
    const sanitizedData = params.data !== undefined ? serializeError(params.data) : undefined;

    return logActionServer({
        message: params.message,
        data: sanitizedData,
        source: params.source,
        userId: params.userId,
    });
}
