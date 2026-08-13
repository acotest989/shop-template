// Form state only — the session itself lives in the store, signIn() comes from the app component.
export const loginPage = () => ({
  email: '',
  password: '',
  pending: false,
  error: '',

  init() {
    this.$refs.email.focus(); // the autofocus attribute is ignored on injected markup
  },

  async submit() {
    if (this.pending) return;

    this.pending = true;
    this.error = '';

    try {
      await this.signIn(this.email, this.password);
    } catch (err) {
      this.error = err.message;
      this.password = '';
      this.$nextTick(() => this.$refs.password.focus()); // wait for :disabled to lift
    } finally {
      this.pending = false;
    }
  },
});
