import { pb } from './pb.js';
import { toProduct } from '../models/product.js';

// What a card draws. Tags belong to the product page, the timestamps to nobody.
const CARD_FIELDS = 'id,handle,title,brand,price_cents,regular_price_cents,currency,stock,rating,image';

// "N of M products" counts the match against the whole catalogue, which a filtered
// request does not report. Any unfiltered load is that number; only a search link
// opened directly has to ask for it, and then once.
let catalogSize = null;

// Pages ask in the app's terms and never learn how the question was answered.
export async function fetchProducts({ q = '' } = {}) {
  const term = q.trim();

  const records = await pb.collection('products').getFullList({
    fields: CARD_FIELDS,
    filter: term ? pb.filter('title ~ {:term} || brand ~ {:term} || tags ?~ {:term}', { term }) : '',
    sort: 'title',
  });

  if (!term) catalogSize = records.length;
  else if (catalogSize === null) catalogSize = await countProducts();

  return { items: records.map(toProduct), total: catalogSize };
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

// One row asked for and thrown away — the total comes back with it either way.
const countProducts = async () =>
  (await pb.collection('products').getList(1, 1, { fields: 'id' })).totalItems;
