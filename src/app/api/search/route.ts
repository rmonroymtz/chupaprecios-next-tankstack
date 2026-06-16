import {
  buildValidatedFilters,
  sanitizeRestApiError,
  searchProducts,
  ValidationError,
} from "@/services/search-server";
import { RestApiError } from "@/services/rest-client";

/**
 * POST /api/search
 *
 * Internal proxy between the browser and the external catalog REST API.
 *
 * The client sends: { query, store, page }
 * The client never sends engine_id — the server derives it from store.
 *
 * Responses:
 *   200 — ProductsResponse domain JSON
 *   400 — validation error (invalid store, non-numeric page)
 *   502 — upstream catalog API error (sanitised — no external URL exposed)
 */
export async function POST(request: Request) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: "Request body must be valid JSON." },
        { status: 400 },
      );
    }

    const raw = body as Record<string, unknown>;

    let filters;
    try {
      filters = buildValidatedFilters({
        query: typeof raw.query === "string" ? raw.query : undefined,
        store: typeof raw.store === "string" ? raw.store : undefined,
        page:
          typeof raw.page === "string" || typeof raw.page === "number"
            ? raw.page
            : undefined,
      });
    } catch (err) {
      if (err instanceof ValidationError) {
        return Response.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    // Empty query — return an empty result set without hitting the external API.
    if (!filters.search) {
      return Response.json(
        { items: [], total: 0, page: filters.page, pageSize: 16 },
        { status: 200 },
      );
    }

    try {
      const result = await searchProducts(filters);
      return Response.json(result);
    } catch (err) {
      if (err instanceof RestApiError) {
        return Response.json(
          { error: sanitizeRestApiError(err) },
          { status: 502 },
        );
      }
      throw err;
    }
  } catch {
    // Top-level safety net: never let an unexpected error leak details
    // (stack trace, upstream host, internal paths) to the client.
    return Response.json({ error: "Internal server error." }, { status: 500 });
  }
}
