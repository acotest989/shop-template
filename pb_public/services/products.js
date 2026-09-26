import { pb } from './pb.js';
import { fieldError } from 'alpineshell';

// The catalogue: what the shop's pages read of it, and what the admin area edits. A record turns
// into the app's own product at the bottom of this file, and the column names stop there —
// price_cents becomes price, regular_price_cents regularPrice.

// A page of the grid: divisible by both column counts, so the last row is never ragged.
const PER_PAGE = 24;
const ADMIN_PER_PAGE = 30;

// A product at or under this many left counts as running low, on the overview and in the
// admin area's list.
export const LOW_STOCK = 5;

// What a card draws, and the weight the cart copies when a card adds to it. Tags belong
// to the product page, the timestamps to nobody.
const CARD_FIELDS = 'id,handle,title,brand,price_cents,regular_price_cents,currency,stock,weight,sold,rating,image';

// Pages ask in the app's terms and never learn how the question was answered.
export async function fetchProducts({ q = '', category = '', page = 1 } = {}) {
  const term = q.trim();

  // Joined with &&, so the term's alternatives need parentheses of their own. Hidden products
  // are asked out by name: the rules keep them from everybody but an admin, and an admin
  // browsing the shop should see what a customer does.
  const clauses = ['hidden = false'];
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
    filter: 'hidden = false', // a category of hidden products only is not one the shop has
    sort: 'category',
  });

  return [...new Set(records.map((record) => record.category))];
}

// No hidden filter here: the rules give a customer nothing for a hidden product, and let an
// admin open its page to see it before it goes on sale.
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

// --- The admin area ---

// The whole catalogue, hidden products included, which the collection rules show an admin
// alone. `show` narrows it: 'listed', 'hidden', or 'low' for what is on sale and running out.
export async function fetchAdminProducts({ q = '', category = '', show = '', page = 1 } = {}) {
  const term = q.trim();

  const clauses = [];
  if (term) clauses.push(pb.filter('(title ~ {:term} || brand ~ {:term} || handle ~ {:term})', { term }));
  if (category) clauses.push(pb.filter('category = {:category}', { category }));
  if (show === 'listed') clauses.push('hidden = false');
  if (show === 'hidden') clauses.push('hidden = true');
  if (show === 'low') clauses.push(pb.filter('hidden = false && stock <= {:limit}', { limit: LOW_STOCK }));

  const result = await pb.collection('products').getList(page, ADMIN_PER_PAGE, {
    filter: clauses.join(' && '),
    sort: show === 'low' ? 'stock,title' : 'title',
    fields: 'id,handle,title,brand,category,price_cents,regular_price_cents,currency,stock,hidden,image',
  });

  return {
    items: result.items.map(toAdminProduct),
    total: result.totalItems,
    totalPages: result.totalPages,
    page: result.page,
  };
}

export async function fetchAdminProduct(id) {
  return toAdminProduct(await pb.collection('products').getOne(id));
}

// What the form offers beside the fields themselves: the categories in use, hidden products'
// included, and the one currency the shop prices in. requestKey null: the SDK would cancel this
// if the page's own list request went to the same address in the meantime.
export async function fetchProductOptions() {
  const records = await pb.collection('products').getFullList({
    fields: 'category,currency',
    sort: 'category',
    requestKey: null,
  });

  return {
    categories: [...new Set(records.map((record) => record.category))],
    currency: records[0]?.currency ?? 'EUR',
  };
}

// A new product when it has no id, every field of an existing one otherwise. What comes back is
// the product as saved, with the stock as it stands.
export async function saveProduct(product, { stockWas } = {}) {
  try {
    const saved = await pb.send('/api/shop/admin/products/save', {
      method: 'POST',
      body: toProductBody(product, { stockWas }),
    });
    return toAdminProduct(saved);
  } catch (err) {
    throw productError(err);
  }
}

// --- What a product is in this app ---

function toProduct(raw) {
  return {
    id: raw.id,
    handle: raw.handle,
    title: raw.title,
    brand: raw.brand,
    category: raw.category,
    description: raw.description, // the card never asks for it, so on a grid it is undefined
    price: raw.price_cents,
    regularPrice: raw.regular_price_cents,
    currency: raw.currency,

    // Only an admin ever gets a hidden one, opening its page; a card never asks for the field.
    hidden: raw.hidden === true,
    available: raw.stock > 0 && raw.hidden !== true,
    stock: raw.stock,
    sold: raw.sold,
    weight: raw.weight, // grams, packed: what decides whether an order ships free
    rating: raw.rating,
    tags: raw.tags ?? [],
    image: raw.image,

    // The gallery, and only the product page asks for it. A product with one picture
    // gets an array of one, so the page has a single rule rather than two cases.
    images: raw.images?.length ? raw.images : [raw.image],
  };
}

// A product as the overview's stock list draws it: what it is, where it lives, how many are left.
export function toStockItem(raw) {
  return {
    id: raw.id,
    handle: raw.handle,
    title: raw.title,
    image: raw.image,
    stock: raw.stock ?? 0,
  };
}

// A product as the admin area edits it: every field there is to change, in the app's names,
// and the two nobody edits by hand — how many sold, and the currency — to show beside them.
function toAdminProduct(raw) {
  return {
    id: raw.id,
    handle: raw.handle,
    title: raw.title,
    brand: raw.brand ?? '',
    category: raw.category,
    description: raw.description ?? '',
    price: raw.price_cents,
    regularPrice: raw.regular_price_cents || 0, // 0 for no struck-through price
    currency: raw.currency,
    stock: raw.stock ?? 0,
    sold: raw.sold ?? 0,
    weight: raw.weight ?? 0,
    image: raw.image ?? '',
    images: raw.images ?? [],
    tags: raw.tags ?? [],
    hidden: raw.hidden === true,
  };
}

// Going out to pb_hooks/lib/products.js. `stockWas` is the stock the form opened with:
// the hook writes a changed stock only over that number, so a sale made meanwhile is not undone.
function toProductBody(product, { stockWas } = {}) {
  return {
    id: product.id ?? '',
    title: product.title,
    brand: product.brand,
    category: product.category,
    description: product.description,
    price: product.price,
    regularPrice: product.regularPrice || 0,
    stock: product.stock,
    stockWas,
    weight: product.weight,
    image: product.image,
    images: product.images,
    tags: product.tags,
    hidden: product.hidden,
  };
}

// Which field of the form a server's complaint belongs to. The hook answers in the form's own
// names, and PocketBase, when its own checks catch something first, in the record's.
const FORM_FIELDS = [
  'title', 'brand', 'category', 'description', 'price', 'regularPrice',
  'stock', 'weight', 'image', 'images', 'tags', 'hidden',
];
const RECORD_FIELDS = { price_cents: 'price', regular_price_cents: 'regularPrice' };

const productField = (name) => RECORD_FIELDS[name] ?? (FORM_FIELDS.includes(name) ? name : null);

// Put the server's complaints on the form's fields. One the form has no field for, a handle
// taken in the same instant say, becomes a plain sentence rather than nothing at all.
function productError(err) {
  const fields = err.data?.data;
  if (err.status !== 400 || !fields || !Object.keys(fields).length) return err;

  const mapped = {};
  for (const [name, detail] of Object.entries(fields)) {
    const field = productField(name);
    if (!field) return new Error(detail.message);
    mapped[field] = detail.message;
  }
  return fieldError(mapped);
}
