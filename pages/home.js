import { fetchProducts } from '../services/products.js';
import { errorMessage } from 'alpineshell';

const SKELETON_COUNT = 12; // roughly a screenful, so the wait has a shape

// init() runs every time the route renders home.html
export const homePage = () => ({
  products: [],
  total: 0,
  q: '',
  pending: true,
  searching: false,
  error: '',
  skeletonCount: SKELETON_COUNT,

  // Only the newest search may write to the page; a slower earlier one is dropped.
  latest: 0,

  async init() {
    this.q = new URLSearchParams(location.search).get('q') ?? '';
    await this.search();
    this.$watch('q', () => this.search());
  },

  async search() {
    const token = ++this.latest;
    this.searching = true;
    this.error = '';
    this.syncUrl();

    try {
      const { items, total } = await fetchProducts({ q: this.q });
      if (token !== this.latest) return;

      this.products = items;
      this.total = total;
    } catch (err) {
      if (token !== this.latest) return;
      console.error(err);
      this.error = errorMessage(err, 'Could not load products.');
    } finally {
      if (token === this.latest) {
        this.pending = false;
        this.searching = false;
      }
    }
  },

  // replaceState, not the router: navigating would re-render the page and steal
  // focus from the input on every keystroke.
  syncUrl() {
    const term = this.q.trim();
    const url = term ? `/?q=${encodeURIComponent(term)}` : '/';
    history.replaceState(history.state, '', url);
  },

  clear() {
    this.q = '';
    this.$refs.search?.focus();
  },

  get isEmpty() {
    return !this.pending && !this.error && this.products.length === 0;
  },
});
