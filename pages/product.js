import { fetchProduct } from '../services/products.js';
import { setPageTitle, errorMessage } from 'alpineshell';
import { t } from '../lib/i18n.js';

export const productPage = () => ({
  product: null,
  shown: 0, // which picture the gallery is on; a fresh component per route resets it
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

  // The main picture advances on click, so it behaves the way a gallery is expected to
  // without hiding anything the thumbnails already show.
  nextImage() {
    this.shown = (this.shown + 1) % this.product.images.length;
  },

  step(by) {
    if (this.inCart) {
      this.$store.cart.setQty(this.product.id, this.inCart + by);
      return;
    }
    this.qty = Math.min(Math.max(this.qty + by, 1), this.$store.cart.maxQty(this.product));
  },

  addToCart() {
    this.$store.cart.add(this.product, this.qty);
    this.notify(t('cart.added', { title: this.product.title }), 'success');
    this.qty = 1; // the next click starts over, or a second one silently doubles the order
  },

  async init() {
    try {
      this.product = await fetchProduct(this.$params.handle);
      if (!this.product) this.error = t('product.notFound');
      setPageTitle(this.product?.title ?? t('title.productNotFound')); // the generic title is set before the fetch
    } catch (err) {
      console.error(err);
      this.error = errorMessage(err, t('product.loadError'));
    } finally {
      this.pending = false;
    }
  },
});
