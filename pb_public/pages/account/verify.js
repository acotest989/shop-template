import { confirmVerification } from '../../services/auth.js';
import { errorMessage } from 'alpineshell';
import { t } from '../../lib/i18n.js';

export const verifyPage = () => ({
  pending: true,
  error: '',

  async init() {
    try {
      await confirmVerification(this.$params.token);
    } catch (err) {
      console.error(err);
      this.error = errorMessage(err, t('verify.error'));
    } finally {
      this.pending = false;
    }
  },
});
