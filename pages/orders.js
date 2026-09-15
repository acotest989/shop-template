import { errorMessage } from 'alpineshell';
import { fetchAllOrders, subscribeToOrders, updateOrder } from '../services/admin.js';

// Every status an order can have, as the collection and the hook know them.
const STATUSES = ['pending', 'shipped', 'delivered', 'returned', 'cancelled'];

// Every order, newest first, a page at a time. Status and payment are changed in place, and
// realtime keeps what is on screen current.
export const ordersPage = () => ({
  orders: [],
  status: '', // empty for every status
  page: 1,
  total: 0,
  totalPages: 0,
  pending: true,
  error: '',

  openId: '', // the order whose details are unfolded
  saving: '', // the order a change is on its way for

  stop: null,
  gone: false, // the page was left while the subscription was still on its way

  // Only the newest load may write to the page; a slower earlier one is dropped.
  latest: 0,

  async init() {
    if (!this.$store.session.user?.admin) {
      this.pending = false;
      return;
    }

    const params = new URLSearchParams(location.search);
    this.status = STATUSES.includes(params.get('status')) ? params.get('status') : '';
    this.page = Number(params.get('page')) || 1;

    await this.load();
    this.$watch('status', () => {
      this.page = 1;
      this.load();
    });

    try {
      const stop = await subscribeToOrders((action, order) => this.receive(action, order));
      if (this.gone) return stop();
      this.stop = stop;
    } catch (err) {
      console.error(err); // the list still works; it only stops keeping itself current
    }
  },

  destroy() {
    this.gone = true;
    this.stop?.();
  },

  async load() {
    const token = ++this.latest;
    this.error = '';
    this.syncUrl();

    try {
      const result = await fetchAllOrders({ status: this.status, page: this.page });
      if (token !== this.latest) return;

      this.orders = result.items;
      this.total = result.total;
      this.totalPages = result.totalPages;
    } catch (err) {
      if (token !== this.latest) return;
      console.error(err);
      this.error = errorMessage(err, 'Could not load the orders.');
    } finally {
      if (token === this.latest) this.pending = false;
    }
  },

  goToPage(n) {
    if (n === this.page || n < 1 || n > this.totalPages) return;
    this.page = n;
    window.scrollTo(0, 0);
    this.load();
  },

  // As on the product grid: replaceState, so a filter or a page leaves no history behind.
  syncUrl() {
    const params = new URLSearchParams();
    if (this.status) params.set('status', this.status);
    if (this.page > 1) params.set('page', this.page);

    const query = params.toString();
    history.replaceState(history.state, '', query ? `/admin/orders?${query}` : '/admin/orders');
  },

  // A change to an order on screen shows where it is. A new order joins the top of the first
  // page when the filter would list it; anything else waits for the next load.
  receive(action, order) {
    const index = this.orders.findIndex((entry) => entry.id === order.id);

    if (action === 'delete') {
      if (index !== -1) this.orders.splice(index, 1);
      return;
    }
    if (index !== -1) {
      this.orders[index] = order;
      return;
    }
    if (action === 'create' && this.page === 1 && (!this.status || order.status === this.status)) {
      this.orders = [order, ...this.orders];
      this.total++;
    }
  },

  toggle(order) {
    this.openId = this.openId === order.id ? '' : order.id;
  },

  // { status } or { paid }. A refusal puts the control back where the server still has it:
  // the select and the checkbox already moved when they were touched.
  async change(order, changes) {
    if (this.saving) return;

    this.saving = order.id;
    try {
      const saved = await updateOrder(order.id, changes);
      this.receive('update', saved);
      this.notify(`${saved.reference} saved.`, 'success');
    } catch (err) {
      console.error(err);
      this.notify(errorMessage(err, 'Could not save the order.'), 'error');
      this.receive('update', { ...order });
    } finally {
      this.saving = '';
    }
  },

  // In the palette's terms, as on the account page: settled is green, ended badly is red.
  statusBadge(order) {
    if (order.status === 'delivered') return 'badge-good';
    if (order.status === 'cancelled' || order.status === 'returned') return 'badge-bad';
    return 'badge-soft';
  },
});
