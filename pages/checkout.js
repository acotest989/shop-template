import { toOrder } from '../models/order.js';
import { placeOrder } from '../services/orders.js';
import { errorMessage } from 'alpineshell';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Formatting varies by country, so only the digits are judged: enough of them to
// dial, no more than E.164 allows.
const digitsIn = (value) => value.replace(/\D/g, '').length;

export const checkoutPage = () => ({
  form: { name: '', email: '', phone: '', address: '' },
  errors: { name: '', email: '', phone: '', address: '' },
  submitting: false,
  error: '',
  order: null, // set once the order is placed; the page then shows the receipt

  init() {
    this.form.name = this.$store.session.user?.name ?? '';
    this.form.email = this.$store.session.user?.email ?? '';
  },

  validate() {
    this.errors = {
      name: this.form.name.trim().length < 3 ? 'Please enter your full name.' : '',
      email: EMAIL.test(this.form.email.trim()) ? '' : 'Please enter a valid email address.',
      phone: this.phoneError,
      address: this.form.address.trim().length < 5 ? 'Please enter your address.' : '',
    };

    return !Object.values(this.errors).some(Boolean);
  },

  get phoneError() {
    const digits = digitsIn(this.form.phone);
    if (digits === 0) return 'The courier needs a number to call.';
    return digits < 6 || digits > 15 ? 'Please enter a valid phone number.' : '';
  },

  async submit() {
    if (this.submitting) return;

    this.error = '';
    if (!this.validate()) return;

    this.submitting = true;

    try {
      const order = toOrder({ customer: this.form, items: this.$store.cart.items });
      this.order = await placeOrder(order);
      this.$store.cart.clear(); // only a placed order empties the cart
    } catch (err) {
      console.error(err);
      this.error = errorMessage(err, 'Could not place the order.');
    } finally {
      this.submitting = false;
    }
  },
});
