import {
  updateName,
  changePassword,
  requestEmailChange,
  requestVerification,
  deleteAccount,
  isVerified,
} from '../services/auth.js';
import { fetchOrders } from '../services/orders.js';
import { errorMessage } from 'alpineshell';
import { t } from '../lib/i18n.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 8;

// One section per thing that can go wrong on its own, so a failed password change
// does not clear a saved name or hide an unrelated message.
export const accountPage = () => ({
  verified: isVerified(),
  resent: false,

  orders: { items: [], pending: true, error: '' },
  profile: { name: '', pending: false, error: '' },
  emailChange: { email: '', pending: false, error: '', sent: false },
  password: { old: '', next: '', confirm: '', errors: {}, pending: false, error: '' },
  danger: { confirming: false, pending: false, error: '' },

  init() {
    this.profile.name = this.$store.session.user?.name ?? '';
    this.loadOrders(); // not awaited: the rest of the page has nothing to wait for
  },

  async loadOrders() {
    try {
      this.orders.items = await fetchOrders();
    } catch (err) {
      console.error(err);
      this.orders.error = errorMessage(err, t('account.ordersError'));
    } finally {
      this.orders.pending = false;
    }
  },

  async saveName() {
    const section = this.profile;
    if (section.pending) return;

    section.error = '';

    if (section.name.trim().length < 2) {
      section.error = t('validation.name');
      return;
    }

    section.pending = true;

    try {
      await updateName(section.name);
      this.notify(t('account.nameSaved'), 'success');
    } catch (err) {
      console.error(err);
      section.error = err.fields?.name ?? errorMessage(err, t('account.nameError'));
    } finally {
      section.pending = false;
    }
  },

  async resendVerification() {
    try {
      await requestVerification(this.$store.session.user.email);
      this.resent = true;
      this.notify(t('account.linkOnItsWay'));
    } catch (err) {
      console.error(err);
      this.notify(t('account.linkError'), 'error');
    }
  },

  async sendEmailChange() {
    const section = this.emailChange;
    if (section.pending) return;

    section.error = '';

    if (!EMAIL.test(section.email.trim())) {
      section.error = t('validation.email');
      return;
    }

    section.pending = true;

    try {
      await requestEmailChange(section.email);
      section.sent = true;
    } catch (err) {
      console.error(err);
      section.error = err.fields?.newEmail ?? errorMessage(err, t('account.emailChangeError'));
    } finally {
      section.pending = false;
    }
  },

  async savePassword() {
    const section = this.password;
    if (section.pending) return;

    section.error = '';
    section.errors = {
      next: section.next.length < MIN_PASSWORD ? t('validation.passwordLength', { n: MIN_PASSWORD }) : '',
      confirm: section.confirm === section.next ? '' : t('validation.passwordMatch'),
      old: section.old ? '' : t('account.currentPasswordMissing'),
    };

    if (Object.values(section.errors).some(Boolean)) return;

    section.pending = true;

    try {
      await changePassword({ oldPassword: section.old, password: section.next });
      // The account is signed out everywhere, so there is nothing left to show here.
      this.goTo('/login');
    } catch (err) {
      console.error(err);
      if (err.fields) {
        section.errors = { ...section.errors, old: err.fields.oldPassword ?? '', next: err.fields.password ?? '' };
        section.error = err.fields.oldPassword ? '' : t('validation.checkForm');
      } else {
        section.error = errorMessage(err, t('account.passwordError'));
      }
    } finally {
      section.pending = false;
    }
  },

  async confirmDelete() {
    if (this.danger.pending) return;

    this.danger.pending = true;
    this.danger.error = '';

    try {
      await deleteAccount();
      this.goTo('/');
    } catch (err) {
      console.error(err);
      this.danger.error = errorMessage(err, t('account.deleteError'));
      this.danger.pending = false;
    }
  },
});
