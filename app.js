import { consumeRedirect } from 'alpineshell';
import { money, formatDate, discountPercent, starPercent } from './lib/format.js';
import { nextPath } from './lib/next.js';

// Merged into AlpineShell's root component — available to every page and partial.
export const app = {
  money,
  formatDate,
  discountPercent,
  starPercent,

  // The router's guard runs on navigation, and a session can stop being an admin's between
  // two of them: signed out in another tab, say. Going to the same address again puts an
  // admin page in front of the guard (`allow` in main.js), which sends the visitor wherever
  // it would have from the start. Only there: anywhere else, signing out has its own way to go.
  init() {
    this.$watch('$store.session.user?.admin', (admin, was) => {
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
