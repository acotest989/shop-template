import { consumeRedirect } from 'alpineshell';
import { money, discountPercent, starPercent } from './lib/format.js';

// Merged into AlpineShell's root component — available to every page and partial.
export const app = {
  money,
  discountPercent,
  starPercent,

  async signIn(email, password) {
    await this.$store.session.signIn(email, password);
    this.goTo(consumeRedirect() ?? '/'); // back to whatever the guard blocked
  },

  signOut() {
    this.$store.session.signOut();
    consumeRedirect();
    this.goTo('/login');
  },
};
