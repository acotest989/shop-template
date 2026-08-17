import { register } from '../services/auth.js';
import { errorMessage, consumeRedirect } from 'alpineshell';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 8; // PocketBase's own minimum for the users collection

export const registerPage = () => ({
  form: { name: '', email: '', password: '', passwordConfirm: '' },
  errors: { name: '', email: '', password: '', passwordConfirm: '' },
  pending: false,
  error: '',
  registered: false, // the account exists and the session is open; show the notice

  validate() {
    this.errors = {
      name: this.form.name.trim().length < 2 ? 'Please enter your name.' : '',
      email: EMAIL.test(this.form.email.trim()) ? '' : 'Please enter a valid email address.',
      password:
        this.form.password.length < MIN_PASSWORD
          ? `At least ${MIN_PASSWORD} characters.`
          : '',
      passwordConfirm:
        this.form.passwordConfirm === this.form.password ? '' : 'The passwords do not match.',
    };

    return !Object.values(this.errors).some(Boolean);
  },

  // Whoever the guard bounced to /login may have come here instead; the destination
  // it remembered is still theirs.
  start() {
    this.goTo(consumeRedirect() ?? '/');
  },

  async submit() {
    if (this.pending) return;

    this.error = '';
    if (!this.validate()) return;

    this.pending = true;

    try {
      await register(this.form);
      this.registered = true;
    } catch (err) {
      // Only the server knows an address is taken; it answers per field.
      if (err.fields) {
        this.errors = { ...this.errors, ...err.fields };
      } else {
        console.error(err);
        this.error = errorMessage(err, 'Could not create the account.');
      }
    } finally {
      this.pending = false;
    }
  },
});
