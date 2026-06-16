import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { SearchResults } from "@/app/search/_components/search-results";
import { productsQueryKey } from "@/hooks/useProducts";
import { buildSearchFilters } from "@/lib/search-filters";
import { getQueryClient } from "@/lib/get-query-client";
import { searchProducts, buildValidatedFilters, ValidationError } from "@/services/search-server";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

/**
 * Per-query metadata for SEO.
 *
 * - Title carries the search term for inclusion in SERP snippets.
 * - Canonical includes all active params so every distinct search URL has a
 *   stable, self-referencing canonical (avoids duplicate-content penalties
 *   for paginated results or store variants).
 *
 * SEO skill guidance applied:
 *   • Title 50-60 chars, primary keyword first.
 *   • Canonical self-referencing on every variant.
 *   • Meta description matches page content, unique per query.
 */
export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const sp = await searchParams;
  const filters = buildSearchFilters(sp);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://chupaprecios.com.mx";
  const canonicalUrl = filters.search
    ? `${baseUrl}/search.html?query=${encodeURIComponent(filters.search)}&store=${encodeURIComponent(filters.store)}&page=${filters.page}`
    : `${baseUrl}/search.html`;

  const title = filters.search
    ? `${filters.search} — Search | ChupaPrecios`
    : "Product Search | ChupaPrecios";

  const description = filters.search
    ? `Find the best deals on ${filters.search} across Amazon, eBay, and more at ChupaPrecios.`
    : "Search thousands of products and compare prices at ChupaPrecios.";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * Server Component for the `/search` route (reachable via `/search.html`
 * rewrite in next.config.ts).
 *
 * Opts into dynamic rendering by awaiting `searchParams` — each distinct
 * query URL gets a fresh server render (ADR-5: no ISR for search).
 *
 * Prefetches products DIRECTLY via `searchProducts()` — never via
 * `/api/search` (ADR-1: build-time circular-call hazard; route handlers
 * cannot be fetched during the Next.js build step).
 *
 * The dehydrated cache is passed to `HydrationBoundary` so the client-side
 * `useQuery` in `SearchResults` reuses the server data without a second
 * network request (ADR-3: shared query key contract via `buildSearchFilters`).
 *
 * Follow-up notes (out of scope per decision #233, do NOT implement here):
 *   (a) Migrate the home `/` client `useProducts` path through a server
 *       boundary, then remove `NEXT_PUBLIC_REST_API_URL` entirely (Step C
 *       of the env migration plan in design §6).
 *   (b) Secure `NEXT_PUBLIC_MAGENTO_GRAPHQL_URL` in
 *       `src/services/magento-client.ts` — same class of public-URL leak,
 *       tracked as a parallel follow-up.
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sp = await searchParams;

  // `filters` drives the SHARED query key (server prefetch key === client
  // useQuery key — ADR-3 correctness requirement).
  const filters = buildSearchFilters(sp);

  const queryClient = getQueryClient();

  // Only prefetch when there is an actual query — an empty search would hit
  // the external API for no reason (and the client shows an empty-state).
  //
  // `buildValidatedFilters` is used here (instead of the shared util) because
  // `searchProducts` requires the stronger `ValidatedFilters` type (store is
  // narrowed to the AllowedStore union). `buildSearchFilters` is used for the
  // query key and client prop so the same plain `{ search, store, page }`
  // shape flows to both sides without importing `server-only` logic into the
  // query key contract.
  if (filters.search) {
    try {
      const validated = buildValidatedFilters({
        query: filters.search,
        store: filters.store,
        page: filters.page,
      });
      await queryClient.prefetchQuery({
        queryKey: productsQueryKey(filters),
        queryFn: () => searchProducts(validated),
      });
    } catch (err) {
      if (!(err instanceof ValidationError)) {
        throw err;
      }
      // Invalid store — skip prefetch; client will show empty/error state.
    }
  }

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-5xl flex-col gap-8 py-16 px-8 bg-white dark:bg-black sm:px-16">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          {filters.search
            ? `Results for "${filters.search}"`
            : "Search Products"}
        </h1>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <SearchResults filters={filters} />
        </HydrationBoundary>
      </main>
    </div>
  );
}
