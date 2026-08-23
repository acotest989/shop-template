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
