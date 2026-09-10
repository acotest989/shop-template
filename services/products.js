import { pb } from './pb.js';
import { toProduct } from '../models/product.js';

// A page of the grid: divisible by both column counts, so the last row is never ragged.
const PER_PAGE = 24;

// What a card draws, and the weight the cart copies when a card adds to it. Tags belong
// to the product page, the timestamps to nobody.
const CARD_FIELDS = 'id,handle,title,brand,price_cents,regular_price_cents,currency,stock,weight,sold,rating,image';

// Pages ask in the app's terms and never learn how the question was answered.
export async function fetchProducts({ q = '', category = '', page = 1 } = {}) {
  const term = q.trim();

  // Joined with &&, so the term's alternatives need parentheses of their own.
  const clauses = [];
  if (category) clauses.push(pb.filter('category = {:category}', { category }));
  if (term) clauses.push(pb.filter('(title ~ {:term} || brand ~ {:term} || tags ?~ {:term})', { term }));

  const result = await pb.collection('products').getList(page, PER_PAGE, {
    fields: CARD_FIELDS,
    filter: clauses.join(' && '),
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

// The catalogue owns the list, so it is read rather than kept in step by hand. One field
// for every row, deduped here, because the list API has no distinct of its own.
export async function fetchCategories() {
  const records = await pb.collection('products').getFullList({
    fields: 'category',
    sort: 'category',
  });

  return [...new Set(records.map((record) => record.category))];
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
