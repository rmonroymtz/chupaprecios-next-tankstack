"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { getQueryClient } from "@/lib/get-query-client";

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * Client-side QueryClient boundary.
 *
 * Uses `getQueryClient()` directly (not `useState`) so React doesn't throw
 * away the client on an initial render that suspends before a Suspense
 * boundary is established below this provider.
 */
export function QueryProvider({ children }: QueryProviderProps) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" ? (
        <ReactQueryDevtools initialIsOpen={false} />
      ) : null}
    </QueryClientProvider>
  );
}
