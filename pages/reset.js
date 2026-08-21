import { confirmPasswordReset } from '../services/auth.js';
import { form } from 'alpineshell';

const MIN_PASSWORD = 8;

export const resetPage = () => ({
  ...form({ password: '', passwordConfirm: '' }),

  done: false,

  validate() {
    return {
      password: this.values.password.length < MIN_PASSWORD ? `At least ${MIN_PASSWORD} characters.` : '',
      passwordConfirm:
        this.values.passwordConfirm === this.values.password ? '' : 'The passwords do not match.',
    };
  },

  async save() {
    await confirmPasswordReset(this.$params.token, this.values.password);
    this.done = true;
  },
});
