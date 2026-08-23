import { pb } from './pb.js';
import { toProduct } from '../models/product.js';

// A page of the grid: divisible by both column counts, so the last row is never ragged.
const PER_PAGE = 24;

// What a card draws. Tags belong to the product page, the timestamps to nobody.
const CARD_FIELDS = 'id,handle,title,brand,price_cents,regular_price_cents,currency,stock,rating,image';

// Pages ask in the app's terms and never learn how the question was answered.
export async function fetchProducts({ q = '', page = 1 } = {}) {
  const term = q.trim();

  const result = await pb.collection('products').getList(page, PER_PAGE, {
    fields: CARD_FIELDS,
    filter: term ? pb.filter('title ~ {:term} || brand ~ {:term} || tags ?~ {:term}', { term }) : '',
    sort: 'title',
  });

  return {
    items: result.items.map(toProduct),
    total: result.totalItems,
    totalPages: result.totalPages,
    page: result.page,
    perPage: result.perPage,
  };
}

export async function fetchProduct(handle) {
  try {
    const record = await pb
      .collection('products')
      .getFirstListItem(pb.filter('handle = {:handle}', { handle }));

    return toProduct(record);
  } catch (err) {
    if (err.status === 404) return null; // no such product is an answer, not a failure
    throw err;
  }
}
