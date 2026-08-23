import { fetchProducts } from '../services/products.js';
import { errorMessage } from 'alpineshell';

const SKELETON_COUNT = 12; // roughly a screenful, so the wait has a shape

// init() runs every time the route renders home.html
export const homePage = () => ({
  products: [],
  total: 0,
  totalPages: 0,
  perPage: 0,
  page: 1,
  q: '',
  pending: true,
  searching: false,
  error: '',
  skeletonCount: SKELETON_COUNT,

  // Only the newest search may write to the page; a slower earlier one is dropped.
  latest: 0,

  async init() {
    const params = new URLSearchParams(location.search);
    this.q = params.get('q') ?? '';
    this.page = Number(params.get('page')) || 1;

    await this.search();

    // A new term is a new result set, so it starts over at the first page.
    this.$watch('q', () => {
      this.page = 1;
      this.search();
    });
  },

  async search() {
    const token = ++this.latest;
    this.searching = true;
    this.error = '';
    this.syncUrl();

    try {
      const result = await fetchProducts({ q: this.q, page: this.page });
      if (token !== this.latest) return;

      this.products = result.items;
      this.total = result.total;
      this.totalPages = result.totalPages;
      this.perPage = result.perPage;
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

  goToPage(n) {
    if (n === this.page || n < 1 || n > this.totalPages) return;
    this.page = n;
    window.scrollTo(0, 0); // the new page starts at its first row, not where the old one ended
    this.search();
  },

  // replaceState, not the router: navigating would re-render the page and steal
  // focus from the input on every keystroke. Paging follows the same rule, so
  // neither a term nor a page number leaves a history entry behind.
  syncUrl() {
    const params = new URLSearchParams();
    const term = this.q.trim();
    if (term) params.set('q', term);
    if (this.page > 1) params.set('page', this.page);

    const query = params.toString();
    history.replaceState(history.state, '', query ? `/?${query}` : '/');
  },

  clear() {
    this.q = '';
    this.$refs.search?.focus();
  },

  // "1–105 of 105" says nothing the shorter form does not.
  get range() {
    if (!this.total) return '';
    if (this.totalPages <= 1) return `${this.total} products`;

    const from = (this.page - 1) * this.perPage + 1;
    return `${from}–${from + this.products.length - 1} of ${this.total}`;
  },

  get isEmpty() {
    return !this.pending && !this.error && this.products.length === 0;
  },
});
