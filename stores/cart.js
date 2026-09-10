import { storageKey } from '../lib/storage.js';

// The most of one product a single order takes. The server refuses more on its own —
// MAX_QTY in server/pb_hooks/orders.pb.js — so this only keeps the cart from building an
// order that would be turned away.
const MAX_QTY = 10;

// A cart line is not a product: only what the cart shows or charges for.
// The price is a snapshot from the moment of adding — that is what the visitor agreed to.
// Both identifiers, doing different jobs: the id keys the line, the handle builds the link.
// A slug is made from text people rewrite; the id keeps pointing at the same product.
const toLine = (product, qty) => ({
  id: product.id,
  handle: product.handle,
  title: product.title,
  image: product.image,
  price: product.price,
  currency: product.currency,
  stock: product.stock,
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