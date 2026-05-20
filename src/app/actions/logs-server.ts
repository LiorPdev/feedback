"use server";

import { logToDb } from "@/lib/logger";
import { syncUser } from "@/lib/user-auth";

export async function logActionServer(params: {
    message: string;
    data?: unknown;
    source?: string;
    userId?: string;
}) {
    const dbUser = await syncUser();
    const finalUserId = params.userId || dbUser?.id || undefined;

    await logToDb({
        message: params.message,
        data: params.data,
        source: params.source,
        userId: finalUserId,
    });
}
