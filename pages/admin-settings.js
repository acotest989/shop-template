import { errorMessage } from 'alpineshell';
import { t, locale } from '../lib/i18n.js';
import { fetchSettings, saveLanguage } from '../services/admin.js';

// The shop's settings: for now its language, which the pages, the mails, the server's messages
// and Telegram all speak. The server writes it into index.html on every load, so a change shows
// the moment the page loads again, and this page loads it again at once.
export const adminSettingsPage = () => ({
  pending: true,
  error: '',
  current: '', // the language the shop speaks
  chosen: '', // the one picked here
  languages: [],
  saving: false,

  async init() {
    try {
      const settings = await fetchSettings();
      this.current = settings.language;
      this.chosen = settings.language;
      this.languages = settings.languages;
    } catch (err) {
      console.error(err);
      this.error = errorMessage(err, t('admin.settings.loadError'));
    } finally {
      this.pending = false;
    }
  },

  // Each language in its own words, the way a picker of languages shows them: English, srpski
  // (latinica). The browser knows the names, so no dictionary has to list every language.
  nameOf(code) {
    try {
      const name = new Intl.DisplayNames([code], { type: 'language' }).of(code);
      return name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
    } catch (err) {
      return code;
    }
  },

  // And in the language the page is in now, for whoever does not read that one.
  nameHere(code) {
    try {
      return new Intl.DisplayNames([locale], { type: 'language' }).of(code);
    } catch (err) {
      return '';
    }
  },

  async save() {
    if (this.saving || this.chosen === this.current) return;
    this.saving = true;

    try {
      await saveLanguage(this.chosen);
      location.reload(); // the page's own texts are the old language's until it loads again
    } catch (err) {
      console.error(err);
      this.notify(errorMessage(err, t('admin.settings.saveError')), 'error');
      this.saving = false;
    }
  },
});
