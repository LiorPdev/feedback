"use server";

import { getDb } from "@/lib/db";
import { users, creditCodes } from "@/lib/schema";
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

export async function generateCreditCode(amount: number) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return { success: false, error: "משתמש לא מחובר" };
    if (amount <= 0) return { success: false, error: "כמות לא תקינה" };

    const db = await getDb();
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, clerkUser.id),
      columns: { tokens: true }
    });

    if (!user || user.tokens < amount) {
      return { success: false, error: "אין מספיק קרדיטים" };
    }

    // Generate a short unique code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();

    await db.batch([
      db.update(users).set({
        tokens: user.tokens - amount,
        updatedAt: new Date().toISOString()
      }).where(eq(users.id, clerkUser.id)),
      db.insert(creditCodes).values({
        code,
        amount,
        senderId: clerkUser.id,
      })
    ]);

    revalidatePath("/dashboard");
    return { success: true, code };
  } catch (error) {
    console.error("Error generating credit code:", error);
    return { success: false, error: "שגיאה ביצירת הקוד" };
  }
}

export async function redeemCreditCode(code: string) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return { success: false, error: "משתמש לא מחובר" };

    const db = await getDb();
    const { creditCodes } = await import("@/lib/schema");

    const creditCode = await db.query.creditCodes.findFirst({
      where: (ccs, { eq }) => eq(ccs.code, code.toUpperCase()),
    });

    if (!creditCode) return { success: false, error: "קוד לא תקין" };
    if (creditCode.isRedeemed) return { success: false, error: "הקוד כבר מומש" };
    if (creditCode.senderId === clerkUser.id) return { success: false, error: "לא ניתן לממש קוד שאתה יצרת" };

    const redeemer = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, clerkUser.id),
      columns: { tokens: true }
    });

    await db.batch([
      db.update(creditCodes).set({
        isRedeemed: true,
        redeemerId: clerkUser.id,
      }).where(eq(creditCodes.id, creditCode.id)),
      db.update(users).set({
        tokens: (redeemer?.tokens ?? 0) + creditCode.amount,
        updatedAt: new Date().toISOString()
      }).where(eq(users.id, clerkUser.id))
    ]);

    revalidatePath("/dashboard");
    return { success: true, amount: creditCode.amount };
  } catch (error) {
    console.error("Error redeeming credit code:", error);
    return { success: false, error: "שגיאה במימוש הקוד" };
  }
}
