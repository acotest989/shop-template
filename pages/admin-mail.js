import { errorMessage } from 'alpineshell';
import { fetchMails, fetchMailPreview } from '../services/admin.js';

// Every mail the shop sends, and each one as it would arrive, filled with the sample data in
// server/mail/mails.json. Nothing is sent from here.
export const adminMailPage = () => ({
  mails: [],
  pending: true,
  error: '',

  selected: '', // the mail on show
  preview: null,
  loading: false,
  previewError: '',
  width: 'desktop', // or 'phone'

  async init() {
    try {
      this.mails = await fetchMails();
    } catch (err) {
      console.error(err);
      this.error = errorMessage(err, 'Could not load the mails.');
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
      this.previewError = errorMessage(err, 'Could not fill this mail.');
    } finally {
      if (this.selected === name) this.loading = false;
    }
  },

  // After a template was edited: the server reads it again for every preview.
  reload() {
    if (this.selected) this.open(this.selected);
  },

  // A link in the mail opens in a tab of its own rather than inside the frame.
  framed() {
    return this.preview ? this.preview.html.replace(/<head>/i, '<head><base target="_blank">') : '';
  },
});
