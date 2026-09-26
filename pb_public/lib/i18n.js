import messages, { locale } from 'lang/shop';

// Every sentence the shop shows, by key: t('cart.empty'). The shop speaks one language,
// chosen in index.html — `lang` on <html>, and the two import map entries that point
// 'lang/shop' and 'lang/admin' at one language's files in /lang/. The shop's part comes in
// with the app itself, so no page ever renders a bare key. The admin area's part is fetched
// only for an account that can open it, and whatever is already on screen fills in when it
// arrives.

const dictionary = { ...messages };
const plural = new Intl.PluralRules(locale);
const reported = new Set();
let adminPart = null;
let adminLoading = false;

// The language's own formats for money and dates: lib/format.js reads it.
export { locale };

// A sentence by its key, with {name} filled in from params. An entry that is a set of plural
// forms picks the one params.n calls for: English knows `one` and `other`, Serbian `one`,
// `few` and `other`, and Intl.PluralRules says which of them a number takes.
export function t(key, params = {}) {
  // Read, so a template that called this redraws when the admin part arrives.
  window.Alpine?.store('i18n')?.version;

  let entry = dictionary[key];
  if (entry === undefined) {
    // An admin sentence while the admin part is still on its way: nothing yet, rather than
    // a key, and the template redraws when it lands.
    if (adminLoading && key.startsWith('admin.')) return '';

    if (!reported.has(key)) {
      reported.add(key);
      console.warn(`i18n: no text for '${key}'`);
    }
    return key;
  }

  if (typeof entry === 'object') entry = entry[plural.select(params.n ?? 0)] ?? entry.other;
  return entry.replace(/\{(\w+)\}/g, (match, name) => (params[name] === undefined ? match : String(params[name])));
}

// The admin area's sentences, asked for as soon as an admin is signed in. Asking again costs
// nothing; a failed fetch is tried again next time.
export function loadAdminTexts() {
  if (adminPart) return adminPart;

  adminLoading = true;
  adminPart = import('lang/admin')
    .then((module) => {
      Object.assign(dictionary, module.default);
    })
    .catch((err) => {
      adminPart = null;
      console.error(err);
    })
    .finally(() => {
      adminLoading = false;
      const store = window.Alpine?.store('i18n');
      if (store) store.version += 1;
    });
  return adminPart;
}

// The store templates listen to through t(), so a part that arrives later redraws what
// already asked for its keys.
export const i18n = () => ({ version: 0 });
