import { fetchProduct } from '../services/products.js';
import { setPageTitle, errorMessage } from 'alpineshell';

export const productPage = () => ({
  product: null,
  qty: 1, // how many the next click adds, until the cart holds some and takes over the count
  pending: true,
  error: '',

  get inCart() {
    return this.$store.cart.qtyOf(this.product?.id);
  },

  // One number on screen: what the cart already holds, or what would be added.
  get shownQty() {
    return this.inCart || this.qty;
  },

  step(by) {
    if (this.inCart) {
      this.$store.cart.setQty(this.product.id, this.inCart + by);
      return;
    }
    this.qty = Math.min(Math.max(this.qty + by, 1), this.product.stock);
  },

  addToCart() {
    this.$store.cart.add(this.product, this.qty);
    this.notify(`${this.product.title} added to cart.`, 'success');
    this.qty = 1; // the next click starts over, or a second one silently doubles the order
  },

  async init() {
    try {
      this.product = await fetchProduct(this.$params.handle);
      if (!this.product) this.error = 'This product does not exist.';
      setPageTitle(this.product?.title ?? 'Product not found'); // the generic title is set before the fetch
    } catch (err) {
      console.error(err);
      this.error = errorMessage(err, 'Could not load the product.');
    } finally {
      this.pending = false;
    }
  },
});
