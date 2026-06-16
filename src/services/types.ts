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
  /** Store to search against (e.g. "amazon", "walmart"). */
  store?: string;
  /** Search engine identifier. */
  engineId?: string;
}

/**
 * Request body for the `/api/v1/search/` endpoint, matching the wire
 * contract expected by the catalog search service.
 */
export interface ProductSearchRequest {
  filters: string;
  query: string;
  store: string;
  engine_id: string;
  page: number;
  page_size: number;
}

// ---------------------------------------------------------------------------
// Raw wire format for `/api/v1/search/` (anti-corruption boundary).
//
// These types mirror exactly what the search service returns. They are kept
// internal to the data layer (`useProducts`) and mapped into the clean
// domain types above before reaching any component.
// ---------------------------------------------------------------------------

export interface RawSearchPagination {
  current: number;
  next: string;
  prev: string;
  links: unknown[];
}

export interface RawSearchData {
  products: RawProduct[];
  pagination: RawSearchPagination;
  refinements: unknown[];
  sorts: unknown[];
  totalProducts: number;
  vendor: string;
  engine: string;
}

export interface ProductSearchResponse {
  vendor: string;
  status: string;
  data: RawSearchData;
  search_time: number;
  cache_hit: boolean;
  debug_html: string | null;
}

export interface RawProductPrice {
  current_price: number;
  currency: string;
  /** Pre-discount price, when the item is on sale. */
  before_price?: number;
}

export interface RawProductImage {
  alt?: string;
  src?: string;
}

/** Shape of a single product as returned by the search service. */
export interface RawProduct {
  asin?: string;
  title?: string;
  brand?: string;
  price?: RawProductPrice;
  reviews?: { rating?: number };
  image?: RawProductImage;
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
