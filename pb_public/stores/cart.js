import { storageKey } from '../lib/storage.js';

// The most of one product a single order takes. The server refuses more on its own —
// MAX_QTY in pb_hooks/orders.pb.js — so this only keeps the cart from building an
// order that would be turned away.
const MAX_QTY = 10;

// The shipping rules as the hook has them: SHIPPING, FREE_FROM and FREE_UP_TO in
// pb_hooks/orders.pb.js. The hook's are the ones that count, and it refuses an
// order whose page showed less shipping than it works out.
const SHIPPING = 1500;
const FREE_FROM = 30000;
const FREE_UP_TO = 20000;

// A cart line is not a product: only what the cart shows or charges for.
// The price is a snapshot from the moment of adding — that is what the visitor agreed to.
// Both identifiers, doing different jobs: the id keys the line, the handle builds the link.
// A slug is made from text people rewrite; the id keeps pointing at the same product.
// The weight only tells the cart whether the order ships free; the hook weighs again.
const toLine = (product, qty) => ({
  id: product.id,
  handle: product.handle,
  title: product.title,
  image: product.image,
  price: product.price,
  currency: product.currency,
  stock: product.stock,
  weight: product.weight,
  qty,
});

export const cart = () => ({
  items: Alpine.$persist([]).as(storageKey('cart')),
  
  get count() {
    return this.items.reduce((total, item) => total + item.qty, 0);
  },
  
  get subtotal() {
    return this.items.reduce((total, item) => total + item.price * item.qty, 0);
  },

  // Grams, or null while any line was added before products had a weight: such a cart
  // cannot tell whether it ships free, so it shows the flat rate and the hook decides.
  get weight() {
    let grams = 0;
    for (const item of this.items) {
      if (!(item.weight > 0)) return null;
      grams += item.weight * item.qty;
    }
    return grams;
  },

  // An empty cart ships nothing. One worth FREE_FROM ships free while it weighs no more
  // than FREE_UP_TO; anything else pays the flat rate for its one parcel.
  get shipping() {
    if (!this.items.length) return 0;
    const weight = this.weight;
    return this.subtotal >= FREE_FROM && weight !== null && weight <= FREE_UP_TO ? 0 : SHIPPING;
  },

  // The rules, for the page that explains them.
  freeFrom: FREE_FROM,
  freeUpTo: FREE_UP_TO,

  get total() {
    return this.subtotal + this.shipping;
  },

  get currency() {
    return this.items[0]?.currency || 'EUR';
  },

  qtyOf(id) {
    return this.items.find(item => item.id === id)?.qty || 0;
  },

  // How far a stepper may go: what is on the shelf, and never past what one order takes.
  // Anything with a stock will do — a cart line, or a product not in the cart yet.
  maxQty(item) {
    return Math.min(item.stock, MAX_QTY);
  },

  setQty(id, qty) {
    if (qty < 1) {
      this.remove(id);
      return;
    }
    const item = this.items.find(item => item.id === id);
    if (item) {
      item.qty = Math.min(qty, this.maxQty(item));
    }
  },

  add(product, qty = 1) {
    const item = this.items.find(item => item.id === product.id);
    if (item) {
      this.setQty(item.id, item.qty + qty);
    } else {
      this.items.push(toLine(product, Math.min(qty, this.maxQty(product))));
    }
  },

  remove(id) {
    this.items = this.items.filter(item => item.id !== id);
  },

  clear() {
    this.items = [];
  },

});