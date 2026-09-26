import { pb } from './pb.js';
import { toOrder, fromOrder } from '../models/order.js';

// The one write the collection rules refuse: a hook owns creation, because price and
// stock are settled there, so this goes to its route rather than to /api/collections.
// Whatever the hook refuses — a price that moved, a shelf that emptied — comes back as
// a sentence the checkout page can show as it is.
export async function placeOrder({ customer, payment, items, shipping }) {
  const placed = await pb.send('/api/shop/orders', {
    method: 'POST',
    body: toOrder({ customer, payment, items, shipping }),
  });

  return fromOrder(placed);
}

// The signed-in visitor's own orders. Named in the filter, not left to the rule: the rule
// also lets an admin read every order, and an admin's account page lists only theirs.
export async function fetchOrders() {
  const records = await pb.collection('orders').getFullList({
    filter: pb.filter('user = {:user}', { user: pb.authStore.record?.id ?? '' }),
    sort: '-created',
  });
  return records.map(fromOrder);
}
