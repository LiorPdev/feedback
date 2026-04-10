"use server";

import { getDb } from "@/lib/db";
import { users, songs } from "@/lib/schema";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logToDb } from "@/lib/logger";
import { sendGiftNotification } from "@/lib/mail";

export async function sendArtistGift(songId: string, amount: number, message: string, senderName?: string) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return { success: false, error: "יש להתחבר כדי לשלוח מתנה" };
    }

    const db = await getDb();
    
    // 1. Get sender's current tokens
    const sender = await db.query.users.findFirst({
      where: eq(users.id, clerkUser.id),
      columns: { tokens: true, name: true }
    });

    if (!sender || sender.tokens < amount) {
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

    if (song.userId === clerkUser.id) {
       return { success: false, error: "לא ניתן לשלוח מתנה לעצמך" };
    }

    // 3. Perform the transfer
    await db.batch([
      // Deduct from sender
      db.update(users)
        .set({ 
            tokens: sender.tokens - amount,
            updatedAt: new Date().toISOString()
        })
        .where(eq(users.id, clerkUser.id)),
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
