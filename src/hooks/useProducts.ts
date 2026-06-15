import { useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";

import { restRequest } from "@/services/rest-client";
import type { ProductFilters, ProductsResponse } from "@/services/types";

/**
 * Builds the React Query key for a products listing, scoped by filters so
 * different filter combinations are cached independently.
 */
export function productsQueryKey(filters: ProductFilters = {}) {
  return ["products", filters] as const;
}

/**
 * Fetches the product catalog from the internal REST API.
 *
 * Exported so Server Components can reuse the exact same query function
 * when prefetching with `queryClient.prefetchQuery`.
 */
export async function fetchProducts(
  filters: ProductFilters,
): Promise<ProductsResponse> {
  return restRequest<ProductsResponse>("/products", {
    searchParams: {
      search: filters.search,
      category: filters.category,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      page: filters.page,
      pageSize: filters.pageSize,
    },
  });
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
