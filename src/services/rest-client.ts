/**
 * Typed wrapper over native `fetch` for the internal REST catalog API.
 */

const REST_API_BASE_URL = process.env.NEXT_PUBLIC_REST_API_URL ?? "";

/**
 * Error thrown when the internal REST API returns a non-2xx response, or
 * when the response body cannot be parsed as JSON.
 */
export class RestApiError extends Error {
  readonly status: number;
  readonly url: string;
  readonly body: unknown;

  constructor(message: string, status: number, url: string, body: unknown) {
    super(message);
    this.name = "RestApiError";
    this.status = status;
    this.url = url;
    this.body = body;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  /** Query string parameters to append to the URL. */
  searchParams?: Record<string, string | number | boolean | undefined>;
  /** JSON-serializable request body. */
  body?: unknown;
}

function buildUrl(
  path: string,
  searchParams?: RequestOptions["searchParams"],
): string {
  if (!REST_API_BASE_URL) {
    throw new Error(
      "NEXT_PUBLIC_REST_API_URL is not set. Configure it in your environment " +
        "to point to the internal REST catalog API.",
    );
  }

  const url = new URL(path, REST_API_BASE_URL);

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * Performs a typed request against the internal REST catalog API.
 *
 * Throws {@link RestApiError} when the response status is not in the
 * 2xx range.
 */
export async function restRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { searchParams, body, headers, ...rest } = options;
  const url = buildUrl(path, searchParams);

  const response = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const parsedBody = await parseJsonSafely(response);

  if (!response.ok) {
    throw new RestApiError(
      `REST request to ${url} failed with status ${response.status}`,
      response.status,
      url,
      parsedBody,
    );
  }

  return parsedBody as T;
}
