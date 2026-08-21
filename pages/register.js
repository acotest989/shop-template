import { register } from '../services/auth.js';
import { form, consumeRedirect } from 'alpineshell';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 8; // PocketBase's own minimum for the users collection

export const registerPage = () => ({
  ...form({ name: '', email: '', password: '', passwordConfirm: '' }),

  registered: false, // the account exists and the session is open; show the notice

  // Everything only the browser can decide. That an address is already taken is
  // the server's to say, and form() puts that answer back on the field.
  validate() {
    return {
      name: this.values.name.trim().length < 2 ? 'Please enter your name.' : '',
      email: EMAIL.test(this.values.email.trim()) ? '' : 'Please enter a valid email address.',
      password:
        this.values.password.length < MIN_PASSWORD ? `At least ${MIN_PASSWORD} characters.` : '',
      passwordConfirm:
        this.values.passwordConfirm === this.values.password ? '' : 'The passwords do not match.',
    };
  },

  async save() {
    await register(this.values);
    this.registered = true;
  },

  // Whoever the guard bounced to /login may have come here instead; the destination
  // it remembered is still theirs.
  start() {
    this.goTo(consumeRedirect() ?? '/');
  },
});
