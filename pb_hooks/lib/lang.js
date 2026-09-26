/// <reference path="../../pb_data/types.d.ts" />

// The shop's language on the server's side: what the hooks say back to a page, the Telegram
// messages, money as the mails write it, and which folder of pb_hooks/mail/ the mails come from.
// It is `language` in the one record of `shop_settings`, chosen at /admin/settings, and the
// pages follow it too: lib/site.js asks language() before it hands out index.html.
//
// The sentences are pb_hooks/lang/<language>.json, read on every use like the mails, so an edit
// needs no restart. Whatever a language lacks is taken from en.json. Code that says
// something takes it in with require(__hooks + '/lib/lang.js').

const DIR = __hooks + '/lang/';

// `en` when there is no record, or nothing sensible in it: a shop set up wrong still speaks.
function language() {
  let chosen = '';
  try {
    chosen = $app.findFirstRecordByFilter('shop_settings', 'id != ""').getString('language');
  } catch (err) {
    // no settings record at all
  }
  return /^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(chosen) ? chosen : 'en';
}

const load = (name) => {
  try {
    return JSON.parse(toString($os.readFile(DIR + name + '.json')));
  } catch (err) {
    $app.logger().error('pb_hooks/lang unreadable', 'file', name + '.json', 'error', String(err));
    return {};
  }
};

// The forms a number takes, named as Intl.PluralRules names them, which this engine does not
// have. English and the languages of the region are written out; any other has only `other`.
const plural = (lang, n) => {
  const base = lang.split('-')[0];
  if (base === 'en') return n === 1 ? 'one' : 'other';
  if (base === 'sr' || base === 'bs' || base === 'hr') {
    const ten = n % 10;
    const hundred = n % 100;
    if (ten === 1 && hundred !== 11) return 'one';
    if (ten >= 2 && ten <= 4 && (hundred < 12 || hundred > 14)) return 'few';
  }
  return 'other';
};

// The shop's language, read once, for a handler that has more than one thing to say:
//   const lang = require(__hooks + '/lib/lang.js').open();
//   throw new BadRequestError(lang.t('order.priceChanged', { title: title }));
// t() is the pages' t(): {name} is filled in, and { one, few, other } is picked by {n}.
function open() {
  const code = language();
  const own = code === 'en' ? {} : load(code);
  const en = load('en');

  const entry = (key) => (Object.prototype.hasOwnProperty.call(own, key) ? own[key] : en[key]);

  const t = (key, params) => {
    const values = params || {};
    let value = entry(key);
    if (value === undefined) return key;
    if (typeof value === 'object') value = value[plural(code, Number(values.n) || 0)] || value.other;
    return String(value).replace(/\{(\w+)\}/g, (all, name) => (values[name] === undefined ? all : String(values[name])));
  };

  // 1,299.00 EUR, or 1.299,00 € in Serbian: written out, since this engine's toLocaleString
  // knows no locale. The symbol is `currency.EUR` in the language's file, or else the code.
  const money = (cents, currency) => {
    const parts = (Math.abs(cents) / 100).toFixed(2).split('.');
    let rest = parts[0];
    let whole = '';
    while (rest.length > 3) {
      whole = t('number.group') + rest.slice(-3) + whole;
      rest = rest.slice(0, -3);
    }
    return t('money', {
      amount: (cents < 0 ? '-' : '') + rest + whole + t('number.decimal') + parts[1],
      currency: entry('currency.' + currency) || currency,
    });
  };

  // How long a link stays good, from PocketBase's token settings in seconds: 30 minutes, 3 days.
  // The largest unit that divides it evenly, so 90 minutes stays 90 minutes.
  const duration = (seconds) => {
    const s = Number(seconds) || 0;
    if (s >= 86400 && s % 86400 === 0) return t('time.days', { n: s / 86400 });
    if (s >= 3600 && s % 3600 === 0) return t('time.hours', { n: s / 3600 });
    return t('time.minutes', { n: Math.max(1, Math.round(s / 60)) });
  };

  return { language: code, t: t, money: money, duration: duration };
}

module.exports = { language, open };
