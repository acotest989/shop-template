import { requestPasswordReset } from '../services/auth.js';
import { form } from 'alpineshell';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const forgotPage = () => ({
  ...form({ email: '' }, { fallback: 'Could not send the link.' }),

  sent: false,

  validate() {
    return {
      email: EMAIL.test(this.values.email.trim()) ? '' : 'Please enter a valid email address.',
    };
  },

  // The service swallows failures on purpose, so the answer is the same whether or
  // not the address has an account here. Only being rate limited comes back.
  async save() {
    await requestPasswordReset(this.values.email);
    this.sent = true;
  },
});
