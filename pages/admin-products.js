import { errorMessage } from 'alpineshell';
import { fetchAdminProducts, fetchProductOptions, LOW_STOCK } from '../services/admin.js';
import { humanize } from '../lib/helpers.js';

const SHOW = ['', 'listed', 'hidden', 'low'];

// The catalogue as the admin sees it, hidden products included: searched, narrowed and paged
// in the database, like the shop's own grid. A row opens the product for editing.
export const adminProductsPage = () => ({
  products: [],
  total: 0,
  totalPages: 0,
  page: 1,
  q: '',
  category: '',
  show: '', // '' for everything, or one of SHOW
  categories: [],
  pending: true,
  searching: false,
  error: '',
  lowStock: LOW_STOCK,
  humanize, // categories are slugs; the rows show them as words

  // Only the newest load may write to the page; a slower earlier one is dropped.
  latest: 0,

  async init() {
    const params = new URLSearchParams(location.search);
    this.q = params.get('q') ?? '';
    this.category = params.get('category') ?? '';
    this.show = SHOW.includes(params.get('show')) ? params.get('show') : '';
    this.page = Number(params.get('page')) || 1;

    await this.load();

    // Not awaited: the list is the page, the select only narrows it.
    fetchProductOptions()
      .then(({ categories }) => (this.categories = categories.map((value) => ({ value, label: humanize(value) }))))
      .catch((err) => console.error(err));

    // Any of them is a new result set, so it starts over at the first page.
    this.$watch('q', () => this.restart());
    this.$watch('category', () => this.restart());
    this.$watch('show', () => this.restart());
  },

  restart() {
    this.page = 1;
    this.load();
  },

  async load() {
    const token = ++this.latest;
    this.searching = true;
    this.error = '';
    this.syncUrl();

    try {
      const result = await fetchAdminProducts({ q: this.q, category: this.category, show: this.show, page: this.page });
      if (token !== this.latest) return;

      this.products = result.items;
      this.total = result.total;
      this.totalPages = result.totalPages;
    } catch (err) {
      if (token !== this.latest) return;
      console.error(err);
      this.error = errorMessage(err, 'Could not load the products.');
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
    window.scrollTo(0, 0);
    this.load();
  },

  // As on the shop's grid: replaceState, so typing a search leaves no history behind.
  syncUrl() {
    const params = new URLSearchParams();
    const term = this.q.trim();
    if (term) params.set('q', term);
    if (this.category) params.set('category', this.category);
    if (this.show) params.set('show', this.show);
    if (this.page > 1) params.set('page', this.page);

    const query = params.toString();
    history.replaceState(history.state, '', query ? `/admin/products?${query}` : '/admin/products');
  },

  // In the palette's terms: out is red, running low is amber, anything else says nothing.
  stockBadge(product) {
    if (product.stock === 0) return 'badge-bad';
    if (product.stock <= this.lowStock) return 'badge-warn';
    return 'badge-soft';
  },
});
