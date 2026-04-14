import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { cache } from "react";
import { getDb } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";
import { INITIAL_TOKENS } from "./constants";

/**
 * CENTRAL IDENTITY RESOLVER (Hybrid Logic & Account Linking)
 * ---------------------------------------------------------
 * This function is the single source of truth for user identification in the app.
 * It implements a "Soft Login" and "Shadow User" strategy:
 * 
 * 1. Clerk Identity (Primary): Official authenticated session via Google/Social.
 * 2. Guest Identity (Fallback): Identified via a secure 'tmp_id' cookie.
 * 3. Proactive Account Linking: If a guest registers via Clerk using the same email,
 *    this function automatically merges the identities, promoting the shadow record
 *    to a full Clerk member while preserving all credits, songs, and history.
 * 
 * This allows a seamless journey from Facebook Ads (Soft Login) to full community membership.
 */
export const syncUser = cache(async () => {
  try {
    const { userId } = await auth();
    const db = await getDb();

    // 1. Clerk Identity Path
    if (userId) {
      // Find UserID by Clerk ID first (99% of cases)
      let dbUser = await db.query.users.findFirst({
        where: eq(users.clerkId, userId),
      });

      // FAST PATH: If user exists and synced within the last 7 days, return immediately
      if (dbUser) {
        const lastSync = new Date(dbUser.updatedAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        if (lastSync > weekAgo) {
          return dbUser;
        }
      }

      // SLOW PATH: Fetch full user details from Clerk for linking or metadata sync
      const clerkUser = await currentUser();
      if (!clerkUser) return dbUser || null; // Should not happen if userId exists

      const email = clerkUser.emailAddresses[0]?.emailAddress || "";
      const name = clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() : null;
      const primaryAccount = clerkUser.externalAccounts?.[0];
      const provider = primaryAccount?.provider || null;
      const providerId = primaryAccount?.providerUserId || null;

      // If not found by ClerkID yet, try finding by connecting via Email (Shadow User transition)
      if (!dbUser && email) {
        dbUser = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (dbUser) {
          // LINKING: Complete the linkage to the user with Clerk ID
          const [updatedUser] = await db.update(users)
            .set({
              clerkId: userId,
              name: dbUser.name || name,
              provider,
              providerId,
              updatedAt: new Date().toISOString()
            })
            .where(eq(users.id, dbUser.id))
            .returning();
          return updatedUser;
        }
      }

      // Metadata Sync or Weekly Refresh
      if (dbUser) {
        const needsSync =
          dbUser.email !== email ||
          dbUser.name !== name ||
          dbUser.provider !== provider ||
          dbUser.providerId !== providerId;

        if (!needsSync) {
          // Update updatedAt to reset the 7-day timer even if no fields changed
          const [refreshedUser] = await db.update(users)
            .set({ updatedAt: new Date().toISOString() })
            .where(eq(users.id, dbUser.id))
            .returning();
          return refreshedUser;
        }

        const [syncedUser] = await db.update(users)
          .set({
            email,
            name,
            provider,
            providerId,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(users.id, dbUser.id))
          .returning();
        return syncedUser;
      }

      // NEW USER: Create fresh Clerk record
      const [newUser] = await db.insert(users)
        .values({
          id: crypto.randomUUID(),
          clerkId: clerkUser.id,
          email,
          name,
          provider,
          providerId,
          tokens: INITIAL_TOKENS,
          userRank: 1,
          raterScore: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning();

      return newUser;
    }

    // 2. Guest Identity Path (through Ad registration)
    const cookieStore = await cookies();
    const guestUserId = cookieStore.get("tmp_id")?.value;

    if (guestUserId) {
      const guestUser = await db.query.users.findFirst({
        where: eq(users.id, guestUserId),
      });

      if (guestUser) {
        return guestUser;
      }
    }

    return null;
  } catch (error: unknown) {
    console.error("[syncUser] Identity Bridge Error:", error);
    return null;
  }
});
