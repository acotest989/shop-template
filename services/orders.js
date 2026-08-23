import { pb } from './pb.js';
import { toOrder, fromOrder } from '../models/order.js';

// The one write the collection rules refuse: a hook owns creation, because price and
// stock are settled there, so this goes to its route rather than to /api/collections.
// Whatever the hook refuses — a price that moved, a shelf that emptied — comes back as
// a sentence the checkout page can show as it is.
export async function placeOrder({ customer, payment, items }) {
  const placed = await pb.send('/api/shop/orders', {
    method: 'POST',
    body: toOrder({ customer, payment, items }),
  });

  return fromOrder(placed);
}

// No filter here on purpose: the collection's list rule already narrows this to the
// signed-in visitor's own orders, and a rule cannot be forgotten the way a filter can.
export async function fetchOrders() {
  const records = await pb.collection('orders').getFullList({ sort: '-created' });
  return records.map(fromOrder);
}
