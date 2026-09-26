/// <reference path="../pb_data/types.d.ts" />

// The shop's language on the server's side: what the hooks say back to a page, the Telegram
// messages, money as the mails write it, and which folder of server/mail/ the mails come from.
// The pages have lang/ at the shop's root, chosen in index.html, which the server never reads;
// so the language is set once more for this side, as `language` in the one record of
// `shop_settings`.
//
// The sentences are server/lang/<language>.json, read on every use like the mails, so an edit
// needs no restart. Whatever a language lacks is taken from en.json. Not a hook itself: a
// handler takes it in with require(__hooks + '/lang.js').

const DIR = __hooks + '/../lang/';

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
    $app.logger().error('server/lang unreadable', 'file', name + '.json', 'error', String(err));
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
//   const lang = require(__hooks + '/lang.js').open();
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

  return { language: code, t: t, money: money };
}

module.exports = { language, open };
