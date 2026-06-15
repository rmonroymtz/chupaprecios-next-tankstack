import {
  QueryClient,
  defaultShouldDehydrateQuery,
  environmentManager,
} from "@tanstack/react-query";

/**
 * Creates a fresh `QueryClient` with defaults tuned for SSR + hydration.
 *
 * - `staleTime` above 0 avoids an immediate client refetch right after
 *   hydration, since the data was just fetched on the server.
 * - `shouldDehydrateQuery` is extended to also include queries that are
 *   still `pending` when dehydration happens, so streamed/suspended
 *   queries are serialized correctly.
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * Returns a server-safe `QueryClient` instance.
 *
 * - On the server, a brand new `QueryClient` is created for every call so
 *   per-request data never leaks across users.
 * - In the browser, a single `QueryClient` instance is memoized and reused
 *   for the lifetime of the page so React Query's cache persists across
 *   re-renders and suspense retries.
 */
export function getQueryClient(): QueryClient {
  if (environmentManager.isServer()) {
    return makeQueryClient();
  }

  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
