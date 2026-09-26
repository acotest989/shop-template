import { placeOrder } from '../../services/orders.js';
import { form } from 'alpineshell';
import { t } from '../../lib/i18n.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Formatting varies by country, so only the digits are judged: enough of them to
// dial, no more than E.164 allows.
const digitsIn = (value) => value.replace(/\D/g, '').length;

export const checkoutPage = () => ({
  ...form({ name: '', email: '', phone: '', address: '' }, { fallback: t('checkout.error') }),

  order: null, // set once the order is placed; the page then shows the receipt

  // What the form offers. The hook refuses a card order as well, and that refusal is
  // the one that counts — this only decides whether the radio can be reached at all.
  cardPayment: false,

  payment: 'cod', // a choice rather than a field: it cannot be filled in wrong

  init() {
    this.values.name = this.$store.session.user?.name ?? '';
    this.values.email = this.$store.session.user?.email ?? '';
  },

  validate() {
    return {
      name: this.values.name.trim().length < 3 ? t('checkout.nameError') : '',
      email: EMAIL.test(this.values.email.trim()) ? '' : t('validation.email'),
      phone: this.phoneError,
      address: this.values.address.trim().length < 5 ? t('checkout.addressError') : '',
    };
  },

  get phoneError() {
    const digits = digitsIn(this.values.phone);
    if (digits === 0) return t('checkout.phoneMissing');
    return digits < 6 || digits > 15 ? t('checkout.phoneError') : '';
  },

  async save() {
    this.order = await placeOrder({
      customer: this.values,
      payment: this.payment,
      items: this.$store.cart.items,
      shipping: this.$store.cart.shipping,
    });

    this.$store.cart.clear(); // only a placed order empties the cart
  },
});
