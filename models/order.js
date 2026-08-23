// What an order is in this app, in both directions.
//
// Going out, only what the server cannot work out for itself: who is buying, how they
// mean to pay, and which products at which quantity. Coming back, every amount — none
// of them was the client's to decide.

export function toOrder({ customer, payment, items }) {
  return {
    customer: {
      name: customer.name.trim(),
      email: customer.email.trim().toLowerCase(),
      phone: customer.phone.replace(/\s+/g, ' ').trim(),
      address: customer.address.trim(),
    },
    payment,

    // The price travels so the server can refuse a cart that was priced differently,
    // never so it can bill from it.
    items: items.map(({ id, qty, price }) => ({ id, qty, price })),
  };
}

export function fromOrder(placed) {
  return {
    reference: placed.reference,
    customer: { name: placed.name, email: placed.email },
    lines: placed.lines,
    currency: placed.currency,
    subtotal: placed.subtotal,
    shipping: placed.shipping,
    total: placed.total,
    payment: placed.payment,
    paid: placed.paid,
    accountCreated: placed.accountCreated,
  };
}
