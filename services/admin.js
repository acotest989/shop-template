import { pb } from './pb.js';
import { fromOrder } from '../models/order.js';
import { toStockItem } from '../models/admin.js';

// A product at or under this many left counts as running low on the overview.
export const LOW_STOCK = 5;

const ORDERS_PER_PAGE = 20;

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
    pb.collection('products').getList(1, 6, {
      filter: pb.filter('stock <= {:limit}', { limit: LOW_STOCK }),
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
