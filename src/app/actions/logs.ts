"use server";

import { logToDb } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";

/**
 * Server Action to allow client components to log messages to the database.
 */
export async function logAction(params: {
    message: string;
    data?: unknown;
    source?: string;
    userId?: string;
}) {
    const { userId: sessionUserId } = await auth();
    const finalUserId = params.userId || sessionUserId || undefined;

    await logToDb({
        ...params,
        userId: finalUserId,
    });
}
