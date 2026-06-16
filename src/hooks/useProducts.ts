import { useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";

import { restRequest } from "@/services/rest-client";
import { productsQueryKey } from "@/lib/products-query-key";
import type {
  Product,
  ProductFilters,
  ProductSearchRequest,
  ProductSearchResponse,
  ProductsResponse,
  RawProduct,
} from "@/services/types";

const DEFAULT_STORE = "amazon";
const DEFAULT_ENGINE_ID = "direct";
const DEFAULT_PAGE_SIZE = 16;
const DEFAULT_CURRENCY = "MXN";

/**
 * Translates a raw product from the search service into the clean domain
 * {@link Product} model used across the UI.
 *
 * Keeps the wire format (snake_case, optional fields, alternate keys) from
 * leaking into components.
 */
function mapRawProduct(raw: RawProduct, index: number): Product {
  return {
    id: raw.asin ?? String(index),
    sku: raw.asin ?? "",
    name: raw.title ?? "",
    price: raw.price?.current_price ?? 0,
    currency: raw.price?.currency ?? DEFAULT_CURRENCY,
    imageUrl: raw.image?.src ?? null,
    description: raw.brand || null,
  };
}

// `productsQueryKey` lives in `@/lib/products-query-key` (a client-safe module)
// so client components can import it without pulling `rest-client` — and the
// inlined external host — into the browser bundle. Re-exported here to preserve
// the existing import path for server-side and hook callers.
export { productsQueryKey };

/**
 * Fetches the product catalog from the internal REST API.
 *
 * Exported so Server Components can reuse the exact same query function
 * when prefetching with `queryClient.prefetchQuery`.
 */
export async function fetchProducts(
  filters: ProductFilters,
): Promise<ProductsResponse> {
  const body: ProductSearchRequest = {
    filters: "",
    query: filters.search ?? "",
    store: filters.store ?? DEFAULT_STORE,
    engine_id: filters.engineId ?? DEFAULT_ENGINE_ID,
    page: filters.page ?? 1,
    page_size: filters.pageSize ?? DEFAULT_PAGE_SIZE,
  };

  const raw = await restRequest<ProductSearchResponse>("/api/v1/search/", {
    method: "POST",
    body,
  });

  return {
    items: raw.data.products.map(mapRawProduct),
    total: raw.data.totalProducts,
    page: raw.data.pagination.current,
    pageSize: body.page_size,
  };
}

/**
 * Fetches the product catalog from the internal REST API, optionally
 * scoped by `filters`.
 */
export function useProducts(
  filters: ProductFilters = {},
): UseQueryResult<ProductsResponse, Error> {
  return useQuery({
    queryKey: productsQueryKey(filters),
    queryFn: () => fetchProducts(filters),
  });
}
