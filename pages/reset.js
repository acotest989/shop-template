import { confirmPasswordReset } from '../services/auth.js';
import { errorMessage } from 'alpineshell';

const MIN_PASSWORD = 8;

export const resetPage = () => ({
  password: '',
  passwordConfirm: '',
  errors: { password: '', passwordConfirm: '' },
  error: '',
  pending: false,
  done: false,

  validate() {
    this.errors = {
      password: this.password.length < MIN_PASSWORD ? `At least ${MIN_PASSWORD} characters.` : '',
      passwordConfirm: this.passwordConfirm === this.password ? '' : 'The passwords do not match.',
    };

    return !Object.values(this.errors).some(Boolean);
  },

  async submit() {
    if (this.pending) return;

    this.error = '';
    if (!this.validate()) return;

    this.pending = true;

    try {
      await confirmPasswordReset(this.$params.token, this.password);
      this.done = true;
    } catch (err) {
      if (err.fields) {
        this.errors = { ...this.errors, ...err.fields };
      } else {
        console.error(err);
        this.error = errorMessage(err, 'Could not set the new password.');
      }
    } finally {
      this.pending = false;
    }
  },
});
