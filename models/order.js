// What an order is in this app: who is buying, what they are buying, and the one
// place the money adds up. Cart lines are narrowed again — an order keeps no image.

export function toOrder({ customer, items }) {
  const subtotal = items.reduce((total, item) => total + item.price * item.qty, 0);
  const shipping = 0; // the demo ships free; a real shop would price it here

  return {
    customer: {
      name: customer.name.trim(),
      email: customer.email.trim().toLowerCase(),
      phone: customer.phone.replace(/\s+/g, ' ').trim(),
      address: customer.address.trim(),
    },
    lines: items.map(({ id, title, price, qty }) => ({ id, title, price, qty })),
    currency: items[0]?.currency ?? 'EUR',
    subtotal,
    shipping,
    total: subtotal + shipping,
  };
}
