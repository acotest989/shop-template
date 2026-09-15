import { errorMessage } from 'alpineshell';
import { fetchOverview, LOW_STOCK } from '../services/admin.js';

// The admin area's front page: what wants the shop's attention, each figure a way in to it.
export const adminPage = () => ({
  overview: null,
  pending: true,
  error: '',
  lowStock: LOW_STOCK,

  async init() {
    // The server would refuse such an account the figures anyway; this spares it the errors.
    if (!this.$store.session.user?.admin) {
      this.pending = false;
      return;
    }

    try {
      this.overview = await fetchOverview();
    } catch (err) {
      console.error(err);
      this.error = errorMessage(err, 'Could not load the overview.');
    } finally {
      this.pending = false;
    }
  },
});
