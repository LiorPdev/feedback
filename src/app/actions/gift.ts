"use server";

import { getDb } from "@/lib/db";
import { users, songs } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logToDb } from "@/lib/logger";
import { sendGiftNotification } from "@/lib/mail";
import { syncUser } from "@/lib/user-auth";

export async function sendArtistGift(songId: string, amount: number, message: string, senderName?: string) {
  try {
    const dbUser = await syncUser();
    if (!dbUser) {
      return { success: false, error: "יש להתחבר כדי לשלוח מתנה" };
    }

    const db = await getDb();

    // 1. Check sender's current tokens
    if (dbUser.tokens < amount) {
      return { success: false, error: "אין לך מספיק קרדיטים" };
    }

    // 2. Find the artist (song owner)
    const song = await db.query.songs.findFirst({
      where: eq(songs.id, songId),
      with: { user: true }
    });

    if (!song || !song.user) {
      return { success: false, error: "לא ניתן למצוא את האמן" };
    }

    if (song.userId === dbUser.id) {
      return { success: false, error: "לא ניתן לשלוח מתנה לעצמך" };
    }

    // 3. Perform the transfer
    await db.batch([
      // Deduct from sender
      db.update(users)
        .set({
          tokens: dbUser.tokens - amount,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, dbUser.id)),
      // Add to receiver (artist)
      db.update(users)
        .set({
          tokens: (song.user.tokens || 0) + amount,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, song.userId))
    ]);

    // 4. Send email notification (async)
    if (song.user.email) {
      sendGiftNotification({
        to: song.user.email,
        amount: amount,
        message: message,
        senderName: senderName
      }).catch(err => {
        logToDb({
          message: "Failed to send gift notification email",
          data: err,
          source: "gift.ts:sendArtistGift"
        });
      });
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    const err = error as Error;
    await logToDb({
      message: "Failed to send artist gift",
      data: { error: err.message, stack: err.stack, songId, amount },
      source: "actions/gift.ts:sendArtistGift",
    });
    return { success: false, error: "אירעה שגיאה בשליחת המתנה" };
  }
}
