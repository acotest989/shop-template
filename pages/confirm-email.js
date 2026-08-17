import { confirmEmailChange } from '../services/auth.js';
import { errorMessage } from 'alpineshell';

// The token alone is not enough: PocketBase asks for the password too, so a link
// read by somebody else cannot move the account to their address.
export const confirmEmailPage = () => ({
  password: '',
  error: '',
  pending: false,
  done: false,

  async submit() {
    if (this.pending) return;

    this.error = '';

    if (!this.password) {
      this.error = 'Enter your password to confirm.';
      return;
    }

    this.pending = true;

    try {
      await confirmEmailChange(this.$params.token, this.password);
      this.done = true;
    } catch (err) {
      console.error(err);
      this.error = err.fields?.password ?? errorMessage(err, 'Could not confirm the new address.');
    } finally {
      this.pending = false;
    }
  },
});
