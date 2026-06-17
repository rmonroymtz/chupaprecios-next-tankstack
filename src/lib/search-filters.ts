/**
 * Shared search filter normalisation.
 *
 * Used by BOTH the server prefetch (SearchPage) and the client component
 * (SearchResults/useQuery) so they build identical query keys and hydration
 * matches on first paint without a redundant re-fetch.
 *
 * ADR-3 gotcha: React Query key comparison is structural — `search`, `store`,
 * and `page` must carry the same values and the same default on both sides.
 */

const DEFAULT_STORE = "amazon";
const DEFAULT_PAGE = 1;
const DEFAULT_SEARCH = "";

/**
 * Normalises raw URL/form params into a stable filter object.
 *
 * - `search` defaults to `''` (empty string, not undefined) — callers must
 *   check for `filters.search === ''` to decide whether to skip the fetch.
 * - `store` defaults to `'amazon'`; only the first value is used when the
 *   param is provided as a `string[]`.
 * - `page` is coerced to a positive integer, clamped to 1 on invalid input.
 */
export function buildSearchFilters(
  params: Record<string, string | string[] | undefined>,
): { search: string; store: string; page: number } {
  // search ─────────────────────────────────────────────────────────────────
  const rawSearch = Array.isArray(params.query)
    ? params.query[0]
    : params.query;
  const search = (rawSearch ?? DEFAULT_SEARCH).trim().slice(0, 200);

  // store ──────────────────────────────────────────────────────────────────
  const rawStore = Array.isArray(params.store)
    ? params.store[0]
    : params.store;
  const store = (rawStore ?? DEFAULT_STORE).trim() || DEFAULT_STORE;

  // page ───────────────────────────────────────────────────────────────────
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const coercedPage = rawPage !== undefined ? Number(rawPage) : NaN;
  const page =
    Number.isFinite(coercedPage) && coercedPage >= 1
      ? Math.trunc(coercedPage)
      : DEFAULT_PAGE;

  return { search, store, page };
}

/**
 * The normalised shape of search filters produced by {@link buildSearchFilters}.
 * Import this type wherever you need to type a `SearchFilters` value.
 */
export type SearchFilters = ReturnType<typeof buildSearchFilters>;
