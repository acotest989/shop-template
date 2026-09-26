import { register } from '../services/auth.js';
import { form, consumeRedirect } from 'alpineshell';
import { nextPath } from '../lib/next.js';
import { t } from '../lib/i18n.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 8; // PocketBase's own minimum for the users collection

export const registerPage = () => ({
  ...form({ name: '', email: '', password: '', passwordConfirm: '' }),

  registered: false, // the account exists and the session is open; show the notice

  returning: nextPath() !== null, // came from a page that wants them back, the chat on a product

  // Everything only the browser can decide. That an address is already taken is
  // the server's to say, and form() puts that answer back on the field.
  validate() {
    return {
      name: this.values.name.trim().length < 2 ? t('validation.name') : '',
      email: EMAIL.test(this.values.email.trim()) ? '' : t('validation.email'),
      password:
        this.values.password.length < MIN_PASSWORD ? t('validation.passwordLength', { n: MIN_PASSWORD }) : '',
      passwordConfirm:
        this.values.passwordConfirm === this.values.password ? '' : t('validation.passwordMatch'),
    };
  },

  async save() {
    await register(this.values);
    this.registered = true;
  },

  // Whoever the guard bounced to /login may have come here instead; the destination
  // it remembered is still theirs. So is the one a link named.
  start() {
    this.goTo(consumeRedirect() ?? nextPath() ?? '/');
  },
});
