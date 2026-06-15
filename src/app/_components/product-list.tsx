"use client";

import { useState } from "react";

import { useGuestCartId } from "@/hooks/useGuestCartId";
import { useAddToCartMutation, useMagentoCartQuery } from "@/hooks/useMagentoCart";
import { useProducts } from "@/hooks/useProducts";
import type { Product } from "@/services/types";

function formatPrice(price: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(price);
}

interface AddToCartButtonProps {
  product: Product;
  cartId: string | undefined;
  /** Whether the guest cart id is still being resolved. */
  isCartLoading: boolean;
}

function AddToCartButton({
  product,
  cartId,
  isCartLoading,
}: AddToCartButtonProps) {
  const addToCart = useAddToCartMutation();

  const handleClick = () => {
    if (!cartId) {
      return;
    }

    addToCart.mutate({
      cartId,
      sku: product.sku,
      quantity: 1,
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={addToCart.isPending || isCartLoading || !cartId}
        className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-[#ccc]"
      >
        {addToCart.isPending
          ? "Adding..."
          : isCartLoading
            ? "Preparing cart..."
            : "Add to cart"}
      </button>
      {addToCart.isError ? (
        <p className="text-xs text-red-600 dark:text-red-400">
          {addToCart.error.message}
        </p>
      ) : null}
      {addToCart.isSuccess ? (
        <p className="text-xs text-green-600 dark:text-green-400">
          Added to cart.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Small cart summary shown above the product grid. Subscribes to the cart
 * query so that the `useAddToCartMutation` invalidation (on success)
 * refreshes the totals shown here.
 */
function CartSummary({ cartId }: { cartId: string | undefined }) {
  const { data: cart, isLoading, isError, error } = useMagentoCartQuery(cartId);

  if (!cartId || isLoading) {
    return null;
  }

  if (isError) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        Failed to load your cart: {error.message}
      </p>
    );
  }

  if (!cart || cart.totalQuantity === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Your cart is empty.
      </p>
    );
  }

  return (
    <p className="text-sm text-zinc-600 dark:text-zinc-400">
      Cart: {cart.totalQuantity} item{cart.totalQuantity === 1 ? "" : "s"}
      {cart.prices?.grandTotal
        ? ` — ${formatPrice(cart.prices.grandTotal.value, cart.prices.grandTotal.currency)}`
        : null}
    </p>
  );
}

export function ProductList() {
  const [search] = useState("");
  const { data, isLoading, isError, error } = useProducts({ search });
  const {
    cartId,
    isLoading: isCartLoading,
    error: cartError,
  } = useGuestCartId();

  if (isLoading) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading products...</p>;
  }

  if (isError) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        Failed to load products: {error.message}
      </p>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        No products found.
      </p>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {cartError ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          Failed to prepare your cart: {cartError.message}
        </p>
      ) : (
        <CartSummary cartId={cartId} />
      )}
      <ul className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((product) => (
          <li
            key={product.id}
            className="flex flex-col gap-2 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]"
          >
            <h3 className="text-base font-semibold">{product.name}</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {formatPrice(product.price, product.currency)}
            </p>
            <AddToCartButton
              product={product}
              cartId={cartId}
              isCartLoading={isCartLoading}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
