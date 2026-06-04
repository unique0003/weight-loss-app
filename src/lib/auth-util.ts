// src/lib/auth-util.ts
import { auth } from "@/auth";
import { getGuestId } from "@/lib/guest";

/**
 * Returns the currently logged-in user's ID.
 * If the user is not logged in, returns a persistent guest ID.
 */
export async function getCurrentUserId(): Promise<string> {
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }
  return await getGuestId();
}
