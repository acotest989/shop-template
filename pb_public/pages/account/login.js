import { form } from 'alpineshell';

// Form state only — the session itself lives in the store, signIn() comes from the app component.
export const loginPage = () => ({
  ...form({ email: '', password: '' }),

  init() {
    this.$refs.email.focus(); // the autofocus attribute is ignored on injected markup
  },

  async save() {
    try {
      await this.signIn(this.values.email, this.values.password);
    } catch (err) {
      this.values.password = '';
      this.$nextTick(() => this.$refs.password.focus()); // wait for :disabled to lift
      throw err; // the message is form()'s job
    }
  },
});
