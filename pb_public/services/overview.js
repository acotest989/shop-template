import { pb } from './pb.js';
import { LOW_STOCK, toStockItem } from './products.js';

// The admin area's front page: what wants the shop's attention, read from several collections.

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
