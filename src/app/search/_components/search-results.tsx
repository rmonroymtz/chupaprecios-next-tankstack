"use client";

import { useQuery } from "@tanstack/react-query";

import { productsQueryKey } from "@/lib/products-query-key";
import type { SearchFilters } from "@/lib/search-filters";
import type { Product, ProductsResponse } from "@/services/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(price);
}

async function fetchSearchResults(filters: SearchFilters): Promise<ProductsResponse> {
  const res = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: filters.search,
      store: filters.store,
      page: filters.page,
    }),
  });

  if (!res.ok) {
    let message = `Search request failed (${res.status}).`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) {
        message = data.error;
      }
    } catch {
      // ignore parse failures — keep the status-based message
    }
    throw new Error(message);
  }

  return res.json() as Promise<ProductsResponse>;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProductCard({ product }: { product: Product }) {
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
      {product.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.imageUrl}
          alt={product.name}
          width={240}
          height={240}
          loading="lazy"
          className="w-full rounded object-contain"
        />
      ) : null}
      <h3 className="text-base font-semibold">{product.name}</h3>
      {product.description ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {product.description}
        </p>
      ) : null}
      <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {formatPrice(product.price, product.currency)}
      </p>
    </li>
  );
}

function LoadingSkeleton() {
  return (
    <ul className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <li
            // index key is safe for static placeholders
          key={i}
          className="h-48 animate-pulse rounded-lg border border-black/[.08] bg-zinc-100 dark:border-white/[.145] dark:bg-zinc-800"
        />
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface SearchResultsProps {
  filters: SearchFilters;
}

/**
 * Client component that renders search results for the given {@link filters}.
 *
 * Hydration note: the server prefetches under the same query key
 * (`productsQueryKey(filters)`) so the dehydrated data from
 * `HydrationBoundary` is reused here — no extra network request fires on
 * first paint when `filters.search` is non-empty.
 *
 * Security note: this component NEVER imports `search-server.ts` or
 * `rest-client.ts`. All data fetching goes through `POST /api/search`.
 */
export function SearchResults({ filters }: SearchResultsProps) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: productsQueryKey(filters),
    queryFn: () => fetchSearchResults(filters),
    enabled: filters.search !== "",
  });

  // Empty search — show a prompt rather than triggering any fetch.
  if (!filters.search) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Enter a search term above to find products.
      </p>
    );
  }

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        Could not load results: {error.message}
      </p>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        No products found for &ldquo;{filters.search}&rdquo;.
      </p>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {data.total} result{data.total === 1 ? "" : "s"} — page {data.page}
      </p>
      <ul className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </ul>
    </div>
  );
}
