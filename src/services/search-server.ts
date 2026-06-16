import "server-only";

import { restRequest, RestApiError } from "@/services/rest-client";
import type {
  Product,
  ProductSearchRequest,
  ProductSearchResponse,
  ProductsResponse,
  RawProduct,
} from "@/services/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Authoritative allow-list of valid store identifiers.
 * Any value not in this list is rejected before reaching the external API.
 */
export const STORE_ALLOW_LIST = [
  "amazon",
  "ebay",
  "target",
  "acme",
] as const;

export type AllowedStore = (typeof STORE_ALLOW_LIST)[number];

const DEFAULT_STORE: AllowedStore = "amazon";
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 16;
const DEFAULT_CURRENCY = "MXN";

// ---------------------------------------------------------------------------
// Validation error
// ---------------------------------------------------------------------------

export class ValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

// ---------------------------------------------------------------------------
// Raw → domain mapper (independent copy; useProducts.ts keeps its own copy
// so client-side files never import this server-only module)
// ---------------------------------------------------------------------------

export function mapRawProduct(raw: RawProduct, index: number): Product {
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

// ---------------------------------------------------------------------------
// Validated filters
// ---------------------------------------------------------------------------

export interface ValidatedFilters {
  search: string;
  store: AllowedStore;
  page: number;
}

/**
 * Validates and normalises raw search parameters from the request.
 *
 * - `query` is trimmed and truncated to 200 chars; empty string is allowed
 *   (callers should skip the external API call when search is empty).
 * - `store` must be in {@link STORE_ALLOW_LIST}; throws {@link ValidationError}
 *   on any other value.
 * - `page` is coerced to a positive integer; values < 1 are clamped to 1;
 *   non-numeric values throw {@link ValidationError}.
 */
export function buildValidatedFilters(raw: {
  query?: string;
  store?: string;
  page?: string | number;
}): ValidatedFilters {
  // --- query ---
  const trimmedQuery = (raw.query ?? "").trim().slice(0, 200);

  // --- store ---
  const storeRaw = (raw.store ?? DEFAULT_STORE).trim();
  if (!(STORE_ALLOW_LIST as readonly string[]).includes(storeRaw)) {
    throw new ValidationError(
      "store",
      `Invalid store "${storeRaw}". Must be one of: ${STORE_ALLOW_LIST.join(", ")}.`,
    );
  }
  const store = storeRaw as AllowedStore;

  // --- page ---
  const rawPage = raw.page;
  let page: number;
  if (rawPage === undefined || rawPage === "") {
    page = DEFAULT_PAGE;
  } else {
    const coerced = Number(rawPage);
    if (!Number.isFinite(coerced) || isNaN(coerced)) {
      throw new ValidationError(
        "page",
        `Invalid page value "${rawPage}". Must be a positive integer.`,
      );
    }
    page = Math.max(DEFAULT_PAGE, Math.trunc(coerced));
  }

  return { search: trimmedQuery, store, page };
}

// ---------------------------------------------------------------------------
// Engine derivation
// ---------------------------------------------------------------------------

function deriveEngineId(store: AllowedStore): string {
  return store === "ebay" ? "api" : "direct";
}

// ---------------------------------------------------------------------------
// External API fetch
// ---------------------------------------------------------------------------

/**
 * Fetches products from the external catalog API using server-only credentials.
 *
 * Uses the real `filters.search` value — never a hardcoded placeholder.
 * Derives `engine_id` server-side so the client never needs to send it.
 */
export async function searchProducts(
  filters: ValidatedFilters,
): Promise<ProductsResponse> {
  const body: ProductSearchRequest = {
    filters: "",
    query: filters.search,
    store: filters.store,
    engine_id: deriveEngineId(filters.store),
    page: filters.page,
    page_size: DEFAULT_PAGE_SIZE,
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

// ---------------------------------------------------------------------------
// Error sanitisation
// ---------------------------------------------------------------------------

/**
 * Strips the external API host from a {@link RestApiError} before it reaches
 * any client-facing response payload.
 *
 * The `.url` and `.message` fields on a RestApiError contain the full external
 * URL (including the secret base URL). This helper returns a safe string with
 * only the HTTP status code — no hostname, no path that could expose internal
 * infrastructure.
 */
export function sanitizeRestApiError(err: RestApiError): string {
  return `Upstream catalog request failed with status ${err.status}.`;
}
