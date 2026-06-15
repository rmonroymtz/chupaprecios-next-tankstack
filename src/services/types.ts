/**
 * Shared domain types for the catalog (internal REST API) and the cart
 * (Magento 2 GraphQL).
 */

// ---------------------------------------------------------------------------
// Catalog (internal REST API)
// ---------------------------------------------------------------------------

export interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  description: string | null;
}

export interface ProductFilters {
  /** Free-text search query. */
  search?: string;
  /** Category slug or identifier to filter by. */
  category?: string;
  /** Minimum price (inclusive). */
  minPrice?: number;
  /** Maximum price (inclusive). */
  maxPrice?: number;
  /** Page number, 1-indexed. */
  page?: number;
  /** Number of items per page. */
  pageSize?: number;
}

export interface ProductsResponse {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Cart (Magento 2 GraphQL)
// ---------------------------------------------------------------------------

export interface MagentoMoney {
  value: number;
  currency: string;
}

export interface CartItem {
  uid: string;
  quantity: number;
  product: {
    sku: string;
    name: string;
  };
  prices: {
    rowTotal: MagentoMoney;
  } | null;
}

export interface MagentoCart {
  id: string;
  totalQuantity: number;
  items: CartItem[];
  prices: {
    grandTotal: MagentoMoney | null;
  } | null;
}

export interface AddToCartInput {
  cartId: string;
  sku: string;
  quantity: number;
}
