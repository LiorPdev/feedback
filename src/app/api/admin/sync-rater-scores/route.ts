import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { users } from "@/lib/schema";
import { updateRaterScore } from "@/lib/rater-score";
import { isNotNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    // Basic security check
    if (secret !== "rater_sync_2026") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    
    // Get all users who have a userId
    const activeUsers = await db.select({ userId: users.id })
      .from(users)
      .where(isNotNull(users.id));

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const user of activeUsers) {
      if (!user.userId) continue;
      
      try {
        await updateRaterScore(user.userId);
        successCount++;
        results.push({ userId: user.userId, status: "success" });
      } catch (err: unknown) {
        failCount++;
        const errorMessage = err instanceof Error ? err.message : String(err);
        results.push({ userId: user.userId, status: "error", error: errorMessage });
        console.error(`Failed to update user ${user.userId}:`, err);
      }
    }

    return NextResponse.json({
      message: "Sync completed",
      success: successCount,
      failed: failCount,
      total: activeUsers.length,
      details: results
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Critical error during sync:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
