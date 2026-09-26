import { confirmEmailChange } from '../../services/auth.js';
import { form } from 'alpineshell';
import { t } from '../../lib/i18n.js';

// The token alone is not enough: PocketBase asks for the password too, so a link
// read by somebody else cannot move the account to their address.
export const confirmEmailPage = () => ({
  ...form({ password: '' }, { fallback: t('confirmEmail.error') }),

  done: false,

  validate() {
    return { password: this.values.password ? '' : t('confirmEmail.passwordMissing') };
  },

  async save() {
    await confirmEmailChange(this.$params.token, this.values.password);
    this.done = true;
  },
});
