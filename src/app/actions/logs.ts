"use server";

import { logToDb } from "@/lib/logger";

/**
 * Server Action to allow client components to log messages to the database.
 */
export async function logAction(params: {
    message: string;
    data?: unknown;
    source?: string;
    userId?: string;
}) {
    await logToDb(params);
}
