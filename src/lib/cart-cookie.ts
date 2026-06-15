/**
 * Shared constants for the guest cart cookie.
 *
 * Kept in a plain module (not the `"use server"` action file) because
 * Server Action files may only export async functions — no constants or
 * types.
 */

/**
 * Name of the cookie that stores the Magento guest cart's masked id.
 */
export const GUEST_CART_COOKIE = "guest_cart_id";

/**
 * Cookie lifetime for the guest cart id, in seconds (30 days).
 *
 * Matches Magento's default guest cart lifetime so the cookie does not
 * outlive the cart it references.
 */
export const GUEST_CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
