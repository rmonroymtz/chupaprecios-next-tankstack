"use server";

import { cookies } from "next/headers";

import { createGuestCart } from "@/hooks/useMagentoCart";
import {
  GUEST_CART_COOKIE,
  GUEST_CART_COOKIE_MAX_AGE,
} from "@/lib/cart-cookie";

/**
 * Returns the current guest cart id, creating one if it doesn't exist yet.
 *
 * - Reads the masked cart id from the `guest_cart_id` cookie.
 * - If absent, calls the Magento `createEmptyCart` mutation to create a new
 *   guest cart and persists the resulting id in an httpOnly cookie.
 *
 * Must be called from a Server Action context (e.g. invoked from a Client
 * Component on mount, or from a form action) — cookies can only be written
 * outside of Server Component rendering. Calling this directly during the
 * render of a Server Component will read the existing cookie correctly, but
 * MUST NOT be relied upon to persist a newly created cart id.
 */
export async function getOrCreateGuestCartId(): Promise<string> {
  const cookieStore = await cookies();
  const existingCartId = cookieStore.get(GUEST_CART_COOKIE)?.value;

  if (existingCartId) {
    return existingCartId;
  }

  const cartId = await createGuestCart();

  cookieStore.set(GUEST_CART_COOKIE, cartId, {
    httpOnly: true,
    // Only require HTTPS in production — on plain-HTTP localhost a `secure`
    // cookie would be dropped, so the cart id would never persist and every
    // mount would create a fresh Magento guest cart.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_CART_COOKIE_MAX_AGE,
  });

  return cartId;
}
