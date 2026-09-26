import { pb } from './pb.js';

// Orders: the one a customer places, the ones they have placed, and the admin area's list of
// everybody's. What an order is in this app, in both directions, is at the bottom of this file.

const ORDERS_PER_PAGE = 20;

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

// --- The admin area ---

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

// --- What an order is in this app ---
//
// Going out, only what the server cannot work out for itself: who is buying, how they
// mean to pay, and which products at which quantity. Coming back, every amount — none
// of them was the client's to decide.

function toOrder({ customer, payment, items, shipping }) {
  return {
    customer: {
      name: customer.name.trim(),
      email: customer.email.trim().toLowerCase(),
      phone: customer.phone.replace(/\s+/g, ' ').trim(),
      address: customer.address.trim(),
    },
    payment,

    // The price travels so the server can refuse a cart that was priced differently,
    // never so it can bill from it. The shipping shown travels for the same reason.
    items: items.map(({ id, qty, price }) => ({ id, qty, price })),
    shipping,
  };
}

// Serves the receipt and the history alike: the hook answers in the same field names
// the record carries, so one direction home is enough.
function fromOrder(raw) {
  return {
    id: raw.id, // a record has one; a receipt straight off the wire does not
    reference: raw.reference,
    customer: { name: raw.name, email: raw.email, phone: raw.phone, address: raw.address },
    lines: raw.lines,
    currency: raw.currency,
    subtotal: raw.subtotal,
    shipping: raw.shipping,
    total: raw.total,
    payment: raw.payment,
    paid: raw.paid,
    status: raw.status,

    // PocketBase separates the date and the time with a space, which not every browser
    // will parse. The wire's habits stop here, as they should.
    placedAt: raw.created ? raw.created.replace(' ', 'T') : '',
    accountCreated: raw.accountCreated ?? false,
  };
}
