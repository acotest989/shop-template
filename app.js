import { consumeRedirect } from 'alpineshell';
import { money, formatDate, discountPercent, starPercent } from './lib/format.js';
import { nextPath } from './lib/next.js';
import { t, loadAdminTexts } from './lib/i18n.js';

// Merged into AlpineShell's root component — available to every page and partial.
export const app = {
  money,
  formatDate,
  discountPercent,
  starPercent,
  t, // every sentence on screen: x-text="t('cart.empty')"

  init() {
    // The admin area's sentences, fetched for an admin alone: at once for one already signed
    // in, and the moment one signs in.
    if (this.$store.session.user?.admin) loadAdminTexts();

    // The router's guard runs on navigation, and a session can stop being an admin's between
    // two of them: signed out in another tab, say. Going to the same address again puts an
    // admin page in front of the guard (`allow` in main.js), which sends the visitor wherever
    // it would have from the start. Only there: anywhere else, signing out has its own way to go.
    this.$watch('$store.session.user?.admin', (admin, was) => {
      if (admin) loadAdminTexts();
      if (was && !admin && location.pathname.startsWith('/admin')) {
        this.goTo(location.pathname + location.search);
      }
    });
  },

  async signIn(email, password) {
    await this.$store.session.signIn(email, password);
    this.goTo(consumeRedirect() ?? nextPath() ?? '/'); // back to whatever the guard blocked, or the link named
  },

  signOut() {
    this.$store.session.signOut();
    consumeRedirect();
    this.goTo('/login');
  },
};
