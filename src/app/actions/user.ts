"use server";

import { getDb } from "@/lib/db";
import { users, creditCodes } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logAction } from "./logs";
import { syncUser } from "@/lib/user-auth";
import { cookies } from "next/headers";

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete("tmp_id");
}

export async function updateUserProfile(genre: string, socialLinks: string | null) {
  try {
    const dbUser = await syncUser();
    if (!dbUser) {
      return { success: false, error: "משתמש לא מחובר" };
    }

    const db = await getDb();

    await db
      .update(users)
      .set({
        userGenre: genre || null,
        socialLinks: socialLinks || null,
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, dbUser.id));

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    const err = error as Error;
    await logAction({
      message: "Failed to update user profile",
      data: { error: err.message, stack: err.stack, genre, socialLinks },
      source: "actions/user.ts:updateUserProfile",
    });
    return { success: false, error: "אירעה שגיאה בשמירת הפרופיל" };
  }
}

export async function updateUserGenre(genre: string) {
  try {
    const dbUser = await syncUser();
    if (!dbUser) {
      return { success: false, error: "משתמש לא מחובר" };
    }

    const db = await getDb();

    await db
      .update(users)
      .set({
        userGenre: genre || null,
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, dbUser.id));

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    const err = error as Error;
    await logAction({
      message: "Failed to update user genre",
      data: { error: err.message, stack: err.stack, genre },
      source: "actions/user.ts:updateUserGenre",
    });
    return { success: false, error: "אירעה שגיאה בשמירת הז'אנר" };
  }
}

export async function getUserData() {
  try {
    const dbUser = await syncUser();
    if (!dbUser) return { success: false, error: "משתמש לא מחובר" };

    return {
      success: true,
      email: dbUser.email,
      name: dbUser.name,
      tokens: dbUser.tokens ?? 0,
      userGenre: dbUser.userGenre ?? null,
      socialLinks: dbUser.socialLinks ?? null
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
    const dbUser = await syncUser();
    if (!dbUser) return { success: false, error: "משתמש לא מחובר" };
    if (amount <= 0) return { success: false, error: "כמות לא תקינה" };

    const db = await getDb();

    if (dbUser.tokens < amount) {
      return { success: false, error: "אין מספיק קרדיטים" };
    }

    // Generate a short unique code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();

    await db.batch([
      db.update(users).set({
        tokens: dbUser.tokens - amount,
        updatedAt: new Date().toISOString()
      }).where(eq(users.id, dbUser.id)),
      db.insert(creditCodes).values({
        code,
        amount,
        senderId: dbUser.id,
      })
    ]);

    revalidatePath("/dashboard");
    return { success: true, code };
  } catch (error) {
    const err = error as Error;
    await logAction({
      message: "Error generating credit code",
      data: { error: err.message, stack: err.stack, amount },
      source: "actions/user.ts:generateCreditCode",
    });
    return { success: false, error: "שגיאה ביצירת הקוד" };
  }
}

export async function redeemCreditCode(code: string) {
  try {
    const dbUser = await syncUser();
    if (!dbUser) return { success: false, error: "משתמש לא מחובר" };

    const db = await getDb();
    const { creditCodes } = await import("@/lib/schema");

    const creditCode = await db.query.creditCodes.findFirst({
      where: (ccs, { eq }) => eq(ccs.code, code.toUpperCase()),
    });

    if (!creditCode) return { success: false, error: "קוד לא תקין" };
    if (creditCode.isRedeemed) return { success: false, error: "הקוד כבר מומש" };
    if (creditCode.senderId === dbUser.id) return { success: false, error: "לא ניתן לממש קוד שאתם יצרתם" };

    await db.batch([
      db.update(creditCodes).set({
        isRedeemed: true,
        redeemerId: dbUser.id,
      }).where(eq(creditCodes.id, creditCode.id)),
      db.update(users).set({
        tokens: (dbUser.tokens ?? 0) + creditCode.amount,
        updatedAt: new Date().toISOString()
      }).where(eq(users.id, dbUser.id))
    ]);

    revalidatePath("/dashboard");
    return { success: true, amount: creditCode.amount };
  } catch (error) {
    const err = error as Error;
    await logAction({
      message: "Error redeeming credit code",
      data: { error: err.message, stack: err.stack, code },
      source: "actions/user.ts:redeemCreditCode",
    });
    return { success: false, error: "שגיאה במימוש הקוד" };
  }
}
