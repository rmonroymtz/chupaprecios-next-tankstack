import type { ProductFilters } from "@/services/types";

/**
 * Builds the React Query key for a products listing, scoped by filters so
 * different filter combinations are cached independently.
 *
 * Client-safe by design: this module has NO server-only imports (notably not
 * `rest-client`), so `"use client"` components can share the exact query-key
 * contract used by server-side prefetch without dragging the REST client — and
 * its inlined external host URL — into the browser bundle.
 */
export function productsQueryKey(filters: ProductFilters = {}) {
  return ["products", filters] as const;
}
