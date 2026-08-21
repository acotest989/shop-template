import { confirmEmailChange } from '../services/auth.js';
import { form } from 'alpineshell';

// The token alone is not enough: PocketBase asks for the password too, so a link
// read by somebody else cannot move the account to their address.
export const confirmEmailPage = () => ({
  ...form({ password: '' }, { fallback: 'Could not confirm the new address.' }),

  done: false,

  validate() {
    return { password: this.values.password ? '' : 'Enter your password to confirm.' };
  },

  async save() {
    await confirmEmailChange(this.$params.token, this.values.password);
    this.done = true;
  },
});
