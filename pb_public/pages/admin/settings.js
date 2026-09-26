import { errorMessage } from 'alpineshell';
import { t, locale } from '../../lib/i18n.js';
import { fetchSettings, saveSettings } from '../../services/admin.js';

// The shop's settings, each section saved on its own: the language, which the pages, the mails,
// the server's messages and Telegram all speak; the accent colour; and how the owner hears of a
// new question or order. The server writes the language and the colour into index.html on every
// load, so both reach every visitor with their next page.
export const adminSettingsPage = () => ({
  pending: true,
  error: '',
  saved: null, // the settings as the server has them
  saving: '', // the section on its way: 'language', 'accent' or 'notices'

  // What this page has picked, section by section.
  language: '',
  accent: '',
  notices: {},

  async init() {
    try {
      this.saved = await fetchSettings();
      this.language = this.saved.language;
      this.accent = this.saved.accent;
      this.notices = { ...this.saved.notices };
    } catch (err) {
      console.error(err);
      this.error = errorMessage(err, t('admin.settings.loadError'));
    } finally {
      this.pending = false;
    }

    // A colour shows the moment it is picked, on this page and the admin header around it.
    this.$watch('accent', (accent) => (document.documentElement.dataset.accent = accent));
  },

  // Leaving with a colour tried but not saved puts the saved one back.
  destroy() {
    if (this.saved) document.documentElement.dataset.accent = this.saved.accent;
  },

  changed(section) {
    if (!this.saved) return false;
    if (section === 'notices') {
      return Object.keys(this.notices).some((name) => this.notices[name] !== this.saved.notices[name]);
    }
    return this[section] !== this.saved[section];
  },

  // Each language in its own words, the way a picker of languages shows them: English, Srpski
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

  async save(section) {
    if (this.saving || !this.changed(section)) return;
    this.saving = section;

    try {
      const saved = await saveSettings({ [section]: section === 'notices' ? { ...this.notices } : this[section] });

      // The page's own texts are the old language's until it loads again.
      if (section === 'language') {
        location.reload();
        return;
      }

      this.saved = saved;
      this.notify(t('admin.settings.saved'), 'success');
    } catch (err) {
      console.error(err);
      this.notify(errorMessage(err, t('admin.settings.saveError')), 'error');
    }

    this.saving = '';
  },
});
