import { pb } from './pb.js';
import { fieldError } from 'alpineshell';
import { fromOrder } from '../models/order.js';
import { toStockItem, toAdminProduct, toProductBody, productField, toMail, toMailPreview, toSettings } from '../models/admin.js';

// A product at or under this many left counts as running low, on the overview and in the
// products list.
export const LOW_STOCK = 5;

const ORDERS_PER_PAGE = 20;
const PRODUCTS_PER_PAGE = 30;

// One number from a filter. A page of one record carries the total the overview wants.
// requestKey null: the SDK cancels a request when another one goes to the same address, and
// the overview asks the orders collection two things at once.
const count = async (collection, filter) => {
  const result = await pb.collection(collection).getList(1, 1, { filter, fields: 'id', requestKey: null });
  return result.totalItems;
};

// The overview's four figures, read side by side. "Today" is the admin's own day, from their
// local midnight, rather than the server's.
export async function fetchOverview() {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const since = midnight.toISOString().replace('T', ' ');

  const [waiting, today, pending, low] = await Promise.all([
    count('threads', 'waiting = true'),
    count('orders', pb.filter('created >= {:since}', { since })),
    count('orders', 'status = "pending"'),
    // Hidden products are not waiting on anybody to restock them.
    pb.collection('products').getList(1, 6, {
      filter: pb.filter('hidden = false && stock <= {:limit}', { limit: LOW_STOCK }),
      sort: 'stock,title',
      fields: 'id,handle,title,image,stock',
    }),
  ]);

  return {
    waiting,
    today,
    pending,
    lowStock: { count: low.totalItems, items: low.items.map(toStockItem) },
  };
}

// No customer in the filter: this is the admin's list of everyone's orders, which only the
// collection rules decide who may read.
export async function fetchAllOrders({ status = '', page = 1 } = {}) {
  const result = await pb.collection('orders').getList(page, ORDERS_PER_PAGE, {
    filter: status ? pb.filter('status = {:status}', { status }) : '',
    sort: '-created',
  });

  return {
    items: result.items.map(fromOrder),
    total: result.totalItems,
    totalPages: result.totalPages,
    page: result.page,
  };
}

export function subscribeToOrders(onChange) {
  return pb.collection('orders').subscribe('*', (event) => onChange(event.action, fromOrder(event.record)));
}

// Either or both of { status, paid }. What comes back is the order as saved; a status the
// stock cannot follow comes back as the hook's sentence instead.
export async function updateOrder(orderId, changes) {
  const saved = await pb.send('/api/shop/admin/orders/update', {
    method: 'POST',
    body: { order: orderId, ...changes },
  });
  return fromOrder(saved);
}

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

  const result = await pb.collection('products').getList(page, PRODUCTS_PER_PAGE, {
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

// Every mail the shop sends, from server/mail/mails.json by way of server/pb_hooks/mail.pb.js.
export async function fetchMails() {
  const mails = await pb.send('/api/shop/admin/mail', { method: 'GET' });
  return mails.map(toMail);
}

// One mail as it would go out, filled with its sample. The server reads the template from disk
// each time, so asking again after an edit shows the edit.
export async function fetchMailPreview(name) {
  return toMailPreview(await pb.send(`/api/shop/admin/mail/${encodeURIComponent(name)}`, { method: 'GET' }));
}

// That mail, filled with its sample, sent to the signed-in admin's own address with [Test] in
// front of its subject. Answers with the address it went to.
export async function sendTestMail(name) {
  const answer = await pb.send(`/api/shop/admin/mail/${encodeURIComponent(name)}/test`, { method: 'POST' });
  return answer.to;
}

// The shop's settings, from the one record of `shop_settings` by way of
// server/pb_hooks/settings.pb.js, which hands out only what an admin may change here.
export async function fetchSettings() {
  return toSettings(await pb.send('/api/shop/admin/settings', { method: 'GET' }));
}

// The shop's language, for its pages, mails and messages at once.
export async function saveLanguage(language) {
  const answer = await pb.send('/api/shop/admin/settings', { method: 'POST', body: { language } });
  return answer.language;
}

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
