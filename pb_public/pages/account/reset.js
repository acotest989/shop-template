import { confirmPasswordReset } from '../../services/auth.js';
import { form } from 'alpineshell';
import { t } from '../../lib/i18n.js';

const MIN_PASSWORD = 8;

export const resetPage = () => ({
  ...form({ password: '', passwordConfirm: '' }),

  done: false,

  validate() {
    return {
      password: this.values.password.length < MIN_PASSWORD ? t('validation.passwordLength', { n: MIN_PASSWORD }) : '',
      passwordConfirm:
        this.values.passwordConfirm === this.values.password ? '' : t('validation.passwordMatch'),
    };
  },

  async save() {
    await confirmPasswordReset(this.$params.token, this.values.password);
    this.done = true;
  },
});
