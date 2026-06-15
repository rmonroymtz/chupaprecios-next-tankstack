import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";

import { magentoRequest } from "@/services/magento-client";
import type { AddToCartInput, MagentoCart } from "@/services/types";

/**
 * Builds the React Query key for a Magento cart, scoped by cart id.
 */
export function cartQueryKey(cartId: string | undefined) {
  return ["magento-cart", cartId] as const;
}

const CART_FRAGMENT = /* GraphQL */ `
  fragment CartFields on Cart {
    id
    total_quantity
    items {
      uid
      quantity
      product {
        sku
        name
      }
      prices {
        row_total {
          value
          currency
        }
      }
    }
    prices {
      grand_total {
        value
        currency
      }
    }
  }
`;

const GET_CART_QUERY = /* GraphQL */ `
  query GetCart($cartId: String!) {
    cart(cart_id: $cartId) {
      ...CartFields
    }
  }
  ${CART_FRAGMENT}
`;

const ADD_PRODUCTS_TO_CART_MUTATION = /* GraphQL */ `
  mutation AddProductsToCart($cartId: String!, $cartItems: [CartItemInput!]!) {
    addProductsToCart(cartId: $cartId, cartItems: $cartItems) {
      cart {
        ...CartFields
      }
      user_errors {
        code
        message
      }
    }
  }
  ${CART_FRAGMENT}
`;

/**
 * Creates a new empty guest cart.
 *
 * Confirmed against the Magento 2.4-develop `QuoteGraphQl` schema:
 * `createEmptyCart` is a root mutation with no arguments (when called
 * without a customer token) that returns the masked cart id as `String!`.
 */
const CREATE_EMPTY_CART_MUTATION = /* GraphQL */ `
  mutation CreateEmptyCart {
    createEmptyCart
  }
`;

interface GetCartResponse {
  cart: RawMagentoCart | null;
}

interface AddProductsToCartResponse {
  addProductsToCart: {
    cart: RawMagentoCart;
    user_errors: ReadonlyArray<{ code: string; message: string }>;
  };
}

interface CreateEmptyCartResponse {
  createEmptyCart: string;
}

/** Shape of the `Cart` type as returned by the Magento GraphQL API. */
interface RawMagentoCart {
  id: string;
  total_quantity: number;
  items: ReadonlyArray<{
    uid: string;
    quantity: number;
    product: { sku: string; name: string };
    prices: { row_total: { value: number; currency: string } } | null;
  } | null> | null;
  prices: {
    grand_total: { value: number; currency: string } | null;
  } | null;
}

function mapCart(raw: RawMagentoCart): MagentoCart {
  return {
    id: raw.id,
    totalQuantity: raw.total_quantity,
    items: (raw.items ?? []).flatMap((item) => {
      if (!item) {
        return [];
      }

      return [
        {
          uid: item.uid,
          quantity: item.quantity,
          product: {
            sku: item.product.sku,
            name: item.product.name,
          },
          prices: item.prices
            ? {
                rowTotal: {
                  value: item.prices.row_total.value,
                  currency: item.prices.row_total.currency,
                },
              }
            : null,
        },
      ];
    }),
    prices: {
      grandTotal: raw.prices?.grand_total
        ? {
            value: raw.prices.grand_total.value,
            currency: raw.prices.grand_total.currency,
          }
        : null,
    },
  };
}

/**
 * Creates a new empty Magento guest cart and returns its masked cart id.
 *
 * Intended to be called from a Server Action (e.g.
 * {@link import("@/app/actions/cart").getOrCreateGuestCartId}), since the
 * resulting id must be persisted in a cookie, and cookies can only be
 * written outside of Server Component rendering.
 */
export async function createGuestCart(): Promise<string> {
  const data = await magentoRequest<CreateEmptyCartResponse>(
    CREATE_EMPTY_CART_MUTATION,
  );

  return data.createEmptyCart;
}

async function fetchCart(cartId: string): Promise<MagentoCart | null> {
  const data = await magentoRequest<GetCartResponse>(GET_CART_QUERY, {
    cartId,
  });

  return data.cart ? mapCart(data.cart) : null;
}

async function addProductToCart(
  input: AddToCartInput,
): Promise<MagentoCart> {
  const data = await magentoRequest<AddProductsToCartResponse>(
    ADD_PRODUCTS_TO_CART_MUTATION,
    {
      cartId: input.cartId,
      cartItems: [{ sku: input.sku, quantity: input.quantity }],
    },
  );

  const { cart, user_errors } = data.addProductsToCart;

  if (user_errors.length > 0) {
    throw new Error(user_errors.map((error) => error.message).join(", "));
  }

  return mapCart(cart);
}

/**
 * Fetches the current Magento cart by id.
 *
 * The query is disabled until `cartId` is defined.
 */
export function useMagentoCartQuery(
  cartId: string | undefined,
): UseQueryResult<MagentoCart | null, Error> {
  return useQuery({
    queryKey: cartQueryKey(cartId),
    queryFn: () => fetchCart(cartId as string),
    enabled: Boolean(cartId),
  });
}

/**
 * Adds a product to the Magento cart via `addProductsToCart`.
 *
 * On success, invalidates the cart query for the affected `cartId` so the
 * UI reflects the updated cart contents and totals.
 */
export function useAddToCartMutation(): UseMutationResult<
  MagentoCart,
  Error,
  AddToCartInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addProductToCart,
    onSuccess: (_cart, variables) => {
      void queryClient.invalidateQueries({
        queryKey: cartQueryKey(variables.cartId),
      });
    },
  });
}
