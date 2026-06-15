import { GraphQLClient, ClientError } from "graphql-request";
import type { Variables } from "graphql-request";

const MAGENTO_GRAPHQL_URL = process.env.NEXT_PUBLIC_MAGENTO_GRAPHQL_URL ?? "";

/**
 * Centralized Magento 2 GraphQL client.
 *
 * Headers include the `Store` header placeholder so multi-store setups can
 * scope every request to a storefront. Override per-request via the
 * `headers` argument of {@link magentoRequest} when a different store view
 * is needed.
 */
export const magentoClient = new GraphQLClient(MAGENTO_GRAPHQL_URL, {
  headers: {
    "Content-Type": "application/json",
    Store: "default",
  },
});

/**
 * Error thrown when a Magento GraphQL request fails, either due to
 * transport-level issues or GraphQL `errors` in the response.
 */
export class MagentoApiError extends Error {
  readonly status: number;
  readonly graphqlErrors: ReadonlyArray<{ message: string }>;

  constructor(
    message: string,
    status: number,
    graphqlErrors: ReadonlyArray<{ message: string }>,
  ) {
    super(message);
    this.name = "MagentoApiError";
    this.status = status;
    this.graphqlErrors = graphqlErrors;
  }
}

/**
 * Sends a typed GraphQL request to the Magento 2 endpoint.
 *
 * Wraps `graphql-request`'s {@link ClientError} into a {@link MagentoApiError}
 * with a flattened, typed list of GraphQL errors.
 */
export async function magentoRequest<T>(
  document: string,
  variables?: Variables,
  headers?: HeadersInit,
): Promise<T> {
  try {
    return await magentoClient.request<T>(document, variables, headers);
  } catch (error) {
    if (error instanceof ClientError) {
      const graphqlErrors = (error.response.errors ?? []).map((gqlError) => ({
        message: gqlError.message,
      }));

      throw new MagentoApiError(
        graphqlErrors[0]?.message ?? error.message,
        error.response.status,
        graphqlErrors,
      );
    }

    throw error;
  }
}
