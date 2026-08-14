import { http } from 'alpineshell';
import { toProduct } from '../models/product.js';

const ENDPOINT = 'https://dummyjson.com/products';
const FIELDS = 'title,price,discountPercentage,rating,stock,brand,category,thumbnail,tags,availabilityStatus';

// The promise is cached, not the result, so parallel callers share one request.
let catalogRequest = null;

// Pages ask in the app's terms and never learn how the question was answered.
// dummyjson cannot combine /products/search with anything else, so this adapter
// holds the catalog and matches in memory; against a real API the term would go
// on the wire and this file would be the only one that changed.
export async function fetchProducts({ q = '' } = {}) {
  const catalog = await loadCatalog();
  const term = q.trim().toLowerCase();

  return {
    items: term ? catalog.filter((product) => matches(product, term)) : catalog,
    total: catalog.length,
  };
}

// The API has no lookup by slug, so the handle is resolved against the catalog.
export async function fetchProduct(handle) {
  const catalog = await loadCatalog();
  return catalog.find((product) => product.handle === handle) ?? null;
}

const matches = (product, term) =>
  product.title.toLowerCase().includes(term) ||
  (product.vendor ?? '').toLowerCase().includes(term) ||
  product.tags.some((tag) => tag.toLowerCase().includes(term));

function loadCatalog({ force = false } = {}) {
  if (force || !catalogRequest) {
    catalogRequest = load().catch((err) => {
      catalogRequest = null; // a failed request must not be cached forever
      throw err;
    });
  }

  return catalogRequest;
}

async function load() {
  // limit=0 is dummyjson's "everything"; searching only what you happened to
  // fetch would quietly answer from a fraction of the catalog.
  const { products } = await http.get(ENDPOINT, {
    params: { limit: 0, select: FIELDS },
  });

  return products.map(toProduct);
}
