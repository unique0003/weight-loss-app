// src/lib/guest.ts
import { cookies } from 'next/headers';

const GUEST_COOKIE_NAME = 'weight_loss_guest_id';

/**
 * Returns the existing guest ID from cookies.
 * The cookie is generated and set by Next.js Middleware (src/middleware.ts) automatically.
 */
export async function getGuestId(): Promise<string> {
  const cookieStore = await cookies();
  const guestId = cookieStore.get(GUEST_COOKIE_NAME)?.value;

  if (!guestId) {
    // Fallback if middleware was somehow bypassed
    console.warn("Guest cookie not found in Server Component, using fallback ID");
    return 'fallback-guest-id';
  }

  return guestId;
}

/**
 * Clears the guest ID cookie (used after a successful merge).
 */
export async function clearGuestId() {
  const cookieStore = await cookies();
  cookieStore.delete(GUEST_COOKIE_NAME);
}
