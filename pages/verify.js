import { confirmVerification } from '../services/auth.js';
import { errorMessage } from 'alpineshell';

export const verifyPage = () => ({
  pending: true,
  error: '',

  async init() {
    try {
      await confirmVerification(this.$params.token);
    } catch (err) {
      console.error(err);
      this.error = errorMessage(err, 'Could not verify this address.');
    } finally {
      this.pending = false;
    }
  },
});
