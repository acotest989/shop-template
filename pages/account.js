import {
  updateName,
  changePassword,
  requestEmailChange,
  requestVerification,
  deleteAccount,
  isVerified,
} from '../services/auth.js';
import { errorMessage } from 'alpineshell';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 8;

// One section per thing that can go wrong on its own, so a failed password change
// does not clear a saved name or hide an unrelated message.
export const accountPage = () => ({
  verified: isVerified(),
  resent: false,

  profile: { name: '', pending: false, error: '', saved: false },
  emailChange: { email: '', pending: false, error: '', sent: false },
  password: { old: '', next: '', confirm: '', errors: {}, pending: false, error: '' },
  danger: { confirming: false, pending: false, error: '' },

  init() {
    this.profile.name = this.$store.session.user?.name ?? '';
  },

  async saveName() {
    const section = this.profile;
    if (section.pending) return;

    section.error = '';
    section.saved = false;

    if (section.name.trim().length < 2) {
      section.error = 'Please enter your name.';
      return;
    }

    section.pending = true;

    try {
      await updateName(section.name);
      section.saved = true;
    } catch (err) {
      console.error(err);
      section.error = err.fields?.name ?? errorMessage(err, 'Could not save your name.');
    } finally {
      section.pending = false;
    }
  },

  async resendVerification() {
    try {
      await requestVerification(this.$store.session.user.email);
      this.resent = true;
    } catch (err) {
      console.error(err);
    }
  },

  async sendEmailChange() {
    const section = this.emailChange;
    if (section.pending) return;

    section.error = '';

    if (!EMAIL.test(section.email.trim())) {
      section.error = 'Please enter a valid email address.';
      return;
    }

    section.pending = true;

    try {
      await requestEmailChange(section.email);
      section.sent = true;
    } catch (err) {
      console.error(err);
      section.error = err.fields?.newEmail ?? errorMessage(err, 'Could not send the confirmation.');
    } finally {
      section.pending = false;
    }
  },

  async savePassword() {
    const section = this.password;
    if (section.pending) return;

    section.error = '';
    section.errors = {
      next: section.next.length < MIN_PASSWORD ? `At least ${MIN_PASSWORD} characters.` : '',
      confirm: section.confirm === section.next ? '' : 'The passwords do not match.',
      old: section.old ? '' : 'Enter your current password.',
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
        section.error = err.fields.oldPassword ? '' : 'Please check the form.';
      } else {
        section.error = errorMessage(err, 'Could not change the password.');
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
      this.danger.error = errorMessage(err, 'Could not delete the account.');
      this.danger.pending = false;
    }
  },
});
