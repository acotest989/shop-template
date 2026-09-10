// What an order is in this app, in both directions.
//
// Going out, only what the server cannot work out for itself: who is buying, how they
// mean to pay, and which products at which quantity. Coming back, every amount — none
// of them was the client's to decide.

export function toOrder({ customer, payment, items, shipping }) {
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
export function fromOrder(raw) {
  return {
    id: raw.id, // a record has one; a receipt straight off the wire does not
    reference: raw.reference,
    customer: { name: raw.name, email: raw.email },
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
