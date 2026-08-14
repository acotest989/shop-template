// A cart line is not a product: only what the cart shows or charges for.
// The price is a snapshot from the moment of adding — that is what the visitor agreed to.
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
  items: Alpine.$persist([]).as('cart'),
  
  get count() {
    return this.items.reduce((total, item) => total + item.qty, 0);
  },
  
  get subtotal() {
    return this.items.reduce((total, item) => total + item.price * item.qty, 0);
  },

  get currency() {
    return this.items[0]?.currency || 'USD';
  },

  qtyOf(id) {
    return this.items.find(item => item.id === id)?.qty || 0;
  },

  setQty(id, qty) {
    if (qty < 1) {
      this.remove(id);
      return;
    }
    const item = this.items.find(item => item.id === id);
    if (item) {
      item.qty = Math.min(qty, item.stock);
    }
  },

  add(product, qty = 1) {
    const item = this.items.find(item => item.id === product.id);
    if (item) {
      this.setQty(item.id, item.qty + qty);
    } else {
      this.items.push(toLine(product, Math.min(qty, product.stock)));
    }
  },
  
  remove(id) {
    this.items = this.items.filter(item => item.id !== id);
  },

  clear() {
    this.items = [];
  },

});