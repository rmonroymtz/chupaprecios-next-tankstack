"use client";

import { useEffect, useState } from "react";

import { getOrCreateGuestCartId } from "@/app/actions/cart";

interface UseGuestCartIdResult {
  /** The resolved guest cart id, or `undefined` while it's being resolved. */
  cartId: string | undefined;
  /** Whether the cart id is still being resolved. */
  isLoading: boolean;
  /** Set if resolving/creating the guest cart failed. */
  error: Error | null;
}

/**
 * De-dupes concurrent guest-cart resolutions within a browser session.
 *
 * Without this, React 19 StrictMode's double-mount (dev) or rapid remounts
 * would fire the Server Action twice before the first call persists the
 * cookie, each creating a SEPARATE Magento guest cart. Sharing the in-flight
 * promise guarantees a single `createEmptyCart` per first visit. The promise
 * is cleared once settled so later visits re-read the now-persisted cookie.
 */
let inFlightCartId: Promise<string> | null = null;

function resolveGuestCartId(): Promise<string> {
  inFlightCartId ??= getOrCreateGuestCartId().finally(() => {
    inFlightCartId = null;
  });

  return inFlightCartId;
}

/**
 * Resolves the guest cart id on the client by invoking the
 * `getOrCreateGuestCartId` Server Action on mount.
 *
 * The Server Action reads the `guest_cart_id` cookie if present, or creates
 * a new Magento guest cart via `createEmptyCart` and persists the resulting
 * id in a cookie. Cookies can only be written from a Server Action (not
 * during Server Component rendering), so resolution happens here, on the
 * client, the first time `ProductList` mounts.
 */
export function useGuestCartId(): UseGuestCartIdResult {
  const [cartId, setCartId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    resolveGuestCartId()
      .then((id) => {
        if (isMounted) {
          setCartId(id);
        }
      })
      .catch((cause: unknown) => {
        if (isMounted) {
          setError(
            cause instanceof Error
              ? cause
              : new Error("Failed to resolve guest cart."),
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { cartId, isLoading, error };
}
