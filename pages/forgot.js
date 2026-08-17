import { requestPasswordReset } from '../services/auth.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const forgotPage = () => ({
  email: '',
  error: '',
  pending: false,
  sent: false,

  async submit() {
    if (this.pending) return;

    if (!EMAIL.test(this.email.trim())) {
      this.error = 'Please enter a valid email address.';
      return;
    }

    this.error = '';
    this.pending = true;

    // The service swallows failures on purpose, so the answer is the same whether
    // or not the address has an account here.
    await requestPasswordReset(this.email);

    this.pending = false;
    this.sent = true;
  },
});
