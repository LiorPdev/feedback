"use server";

import { getDb } from "@/lib/db";
import { users } from "@/lib/schema";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logAction } from "./logs";

export async function updateUserGenre(genre: string) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return { success: false, error: "משתמש לא מחובר" };
    }

    const db = await getDb();
    
    // Update the user's genre
    await db
      .update(users)
      .set({ userGenre: genre || null, updatedAt: new Date().toISOString() })
      .where(eq(users.id, clerkUser.id));

    // Revalidate the dashboard to show changes immediately
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    const err = error as Error;
    await logAction({
      message: "Failed to update user genre",
      data: { error: err.message, stack: err.stack, genre },
      source: "actions/user.ts:updateUserGenre",
    });
    return { success: false, error: "אירעה שגיאה בשמירת הסגנון המועדף" };
  }
}

export async function getUserData(userId: string) {
  const db = await getDb();
  try {
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
      columns: { tokens: true, userGenre: true }
    });
    return { 
      success: true, 
      tokens: user?.tokens ?? 0,
      userGenre: user?.userGenre ?? null
    };
  } catch (error) {
    await logAction({ 
      message: "Failed to get user data", 
      data: error, 
      source: "actions/user.ts:getUserData" 
    });
    return { success: false, error: "שגיאה בטעינת נתוני משתמש" };
  }
}
