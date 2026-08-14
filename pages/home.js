import { fetchProducts, PAGE_SIZE } from '../services/products.js';
import { errorMessage } from 'alpineshell';

// init() runs every time the route renders home.html
export const homePage = () => ({
  products: [],
  pending: true,
  error: '',
  pageSize: PAGE_SIZE, // skeleton count matches what the API will return

  async init() {
    try {
      this.products = await fetchProducts();
    } catch (err) {
      console.error(err);
      this.error = errorMessage(err, 'Could not load products.');
    } finally {
      this.pending = false;
    }
  },

  get isEmpty() {
    return !this.pending && !this.error && this.products.length === 0;
  },
});
