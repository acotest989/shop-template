import { errorMessage } from 'alpineshell';
import { t } from '../../lib/i18n.js';
import { fetchMails, fetchMailPreview, sendTestMail } from '../../services/admin.js';

// Every mail the shop sends, and each one as it would arrive, filled with the sample data in
// pb_hooks/mail/mails.json. The one thing sent from here is a test, to the admin's own address.
export const adminMailPage = () => ({
  mails: [],
  pending: true,
  error: '',

  selected: '', // the mail on show
  preview: null,
  loading: false,
  previewError: '',
  width: 'desktop', // or 'phone', or 'text' for the plain-text part
  sending: false,

  async init() {
    try {
      this.mails = await fetchMails();
    } catch (err) {
      console.error(err);
      this.error = errorMessage(err, t('admin.mail.loadError'));
      return;
    } finally {
      this.pending = false;
    }

    // A link to one mail opens it: /admin/mail?mail=order-confirmation
    const wanted = new URLSearchParams(location.search).get('mail');
    const first = this.mails.find((mail) => mail.name === wanted) ?? this.mails[0];
    if (first) this.open(first.name);
  },

  get current() {
    return this.mails.find((mail) => mail.name === this.selected) ?? null;
  },

  async open(name) {
    this.selected = name;
    this.loading = true;
    this.previewError = '';
    history.replaceState(history.state, '', `/admin/mail?mail=${encodeURIComponent(name)}`);

    try {
      const preview = await fetchMailPreview(name);
      if (this.selected === name) this.preview = preview;
    } catch (err) {
      if (this.selected !== name) return; // another mail was picked while this one loaded
      console.error(err);
      this.preview = null;
      this.previewError = errorMessage(err, t('admin.mail.previewError'));
    } finally {
      if (this.selected === name) this.loading = false;
    }
  },

  // After a template was edited: the server reads it again for every preview.
  reload() {
    if (this.selected) this.open(this.selected);
  },

  // The mail on show, as it stands on disk right now, to the admin's own inbox: how it looks in
  // Gmail or on a phone is something a preview can only guess at.
  async sendTest() {
    if (this.sending || !this.selected) return;

    this.sending = true;
    try {
      const to = await sendTestMail(this.selected);
      this.notify(t('admin.mail.sent', { to }), 'success');
    } catch (err) {
      console.error(err);
      this.notify(errorMessage(err, t('admin.mail.sendError')), 'error');
    } finally {
      this.sending = false;
    }
  },

  // A link in the mail opens in a tab of its own rather than inside the frame.
  framed() {
    return this.preview ? this.preview.html.replace(/<head>/i, '<head><base target="_blank">') : '';
  },
});
