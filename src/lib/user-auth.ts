import { currentUser } from "@clerk/nextjs/server";
import { getDb } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";
import { INITIAL_TOKENS } from "./constants";

/**
 * Ensures the Clerk user exists in our local database with the correct initial credits.
 * This should be called on the server side (e.g., in layouts or server actions).
 */
export async function syncUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const db = await getDb();
  
  // Quick check for existing user
  let dbUser = await db.query.users.findFirst({
    where: eq(users.id, clerkUser.id),
  });

  const email = clerkUser.emailAddresses[0]?.emailAddress || "";
  const name = clerkUser.firstName ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim() : null;
  const primaryAccount = clerkUser.externalAccounts?.[0];
  const provider = primaryAccount ? primaryAccount.provider : null;
  const providerId = primaryAccount ? primaryAccount.externalId : null;

  if (!dbUser) {
    // New user: insert with initial tokens
    const [newUser] = await db.insert(users).values({
      id: clerkUser.id,
      email,
      name,
      provider,
      providerId,
      tokens: INITIAL_TOKENS,
    }).returning();
    return newUser;
  } else {
    // Existing user: update activity and check if we should update metadata
    await db.update(users)
        .set({ 
            email, 
            name, 
            provider, 
            providerId, 
            updatedAt: new Date().toISOString() 
        })
        .where(eq(users.id, clerkUser.id));
    
    // Refresh local object
    dbUser = { ...dbUser, email, name, provider, providerId };
  }

  return dbUser;
}
