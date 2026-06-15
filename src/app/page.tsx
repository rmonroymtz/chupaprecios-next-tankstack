import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { ProductList } from "@/app/_components/product-list";
import { fetchProducts, productsQueryKey } from "@/hooks/useProducts";
import { getQueryClient } from "@/lib/get-query-client";
import type { ProductFilters } from "@/services/types";

/**
 * Revalidate the catalog at most once every 60 seconds (ISR).
 *
 * Tunable freshness knob: lower it for a more "live" catalog (more REST
 * backend load), raise it for cheaper renders on slow-moving catalogs.
 *
 * Deliberately the ONLY data covered by this: the cart is resolved and
 * fetched entirely client-side (see `ProductList`), so it stays per-user
 * and always fresh — reading cookies here would force this whole route into
 * dynamic (uncached) rendering and defeat ISR for the catalog.
 */
export const revalidate = 60;

export default async function Home() {
  const queryClient = getQueryClient();
  const filters: ProductFilters = {};

  await queryClient.prefetchQuery({
    queryKey: productsQueryKey(filters),
    queryFn: () => fetchProducts(filters),
  });

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-5xl flex-col gap-8 py-16 px-8 bg-white dark:bg-black sm:px-16">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Catalog
        </h1>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <ProductList />
        </HydrationBoundary>
      </main>
    </div>
  );
}
