import { fetchProducts, fetchCategories } from '../../services/products.js';
import { humanize } from '../../lib/format.js';
import { t } from '../../lib/i18n.js';
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
  category: '',
  categories: [],
  pending: true,
  searching: false,
  error: '',
  skeletonCount: SKELETON_COUNT,

  // Only the newest search may write to the page; a slower earlier one is dropped.
  latest: 0,

  async init() {
    const params = new URLSearchParams(location.search);
    this.q = params.get('q') ?? '';
    this.category = params.get('category') ?? '';
    this.page = Number(params.get('page')) || 1;

    await this.search();
    this.loadCategories(); // not awaited: the grid is the page, the filter only narrows it

    // Either one is a new result set, so it starts over at the first page.
    this.$watch('q', () => this.restart());
    this.$watch('category', () => this.restart());
  },

  restart() {
    this.page = 1;
    this.search();
  },

  async loadCategories() {
    try {
      const names = await fetchCategories();
      this.categories = names.map((name) => ({ value: name, label: humanize(name) }));
    } catch (err) {
      console.error(err); // the select stays empty; searching and browsing still work
    }
  },

  async search() {
    const token = ++this.latest;
    this.searching = true;
    this.error = '';
    this.syncUrl();

    try {
      const result = await fetchProducts({ q: this.q, category: this.category, page: this.page });
      if (token !== this.latest) return;

      this.products = result.items;
      this.total = result.total;
      this.totalPages = result.totalPages;
      this.perPage = result.perPage;
    } catch (err) {
      if (token !== this.latest) return;
      console.error(err);
      this.error = errorMessage(err, t('home.loadError'));
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
    if (this.category) params.set('category', this.category);
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
    if (this.totalPages <= 1) return t('home.count', { n: this.total });

    const from = (this.page - 1) * this.perPage + 1;
    return t('home.range', { from, to: from + this.products.length - 1, total: this.total });
  },

  get isEmpty() {
    return !this.pending && !this.error && this.products.length === 0;
  },
});
