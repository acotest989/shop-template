import { http } from '../alpineshell/index.js';
import { toProduct } from '../models/product.js';

const ENDPOINT = 'https://dummyjson.com/products';
const FIELDS = 'title,price,discountPercentage,rating,stock,brand,category,thumbnail,tags,availabilityStatus';

export const PAGE_SIZE = 12;

// The promise is cached, not the result, so parallel callers share one request.
let productsRequest = null;

export function fetchProducts({ force = false } = {}) {
  if (force || !productsRequest) {
    productsRequest = load().catch((err) => {
      productsRequest = null; // a failed request must not be cached forever
      throw err;
    });
  }

  return productsRequest;
}

// The API has no lookup by slug, so the handle is resolved against the list we already hold.
export async function fetchProduct(handle) {
  const products = await fetchProducts();
  return products.find((p) => p.handle === handle) ?? null;
}

async function load() {
  const { products } = await http.get(ENDPOINT, {
    params: { limit: PAGE_SIZE, select: FIELDS },
  });

  return products.map(toProduct);
}
