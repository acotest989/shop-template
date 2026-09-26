/// <reference path="../../pb_data/types.d.ts" />

// The owner's settings: for any code that has to ask before telling the owner something, and for
// what an admin changes at /admin/settings — the shop's language, its accent colour, and which of
// the owner's notices go out. The routes that call read and save are in pb_hooks/shop.pb.js.

// The owner's notices, as the record names them: mail and Telegram, for questions and orders.
const NOTICES = ['mail_questions', 'mail_orders', 'telegram_questions', 'telegram_orders'];

const record = () => {
  try {
    return $app.findFirstRecordByFilter('shop_settings', 'id != ""');
  } catch (err) {
    return null; // deleted in the dashboard
  }
};

// Whether a switch in the one record of `shop_settings` is on. With no record at all, every
// switch counts as on: that is how the shop behaved before it had any.
function on(name) {
  const found = record();
  return found ? found.getBool(name) : true;
}

// The values a select field of `shop_settings` offers, so a language or a colour added by a
// migration is a choice everywhere without a list to keep in step.
function choices(name) {
  const values = $app.findCollectionByNameOrId('shop_settings').fields.getByName(name).values;
  const list = [];
  for (let i = 0; i < values.length; i++) list.push(String(values[i]));
  return list;
}

// What /admin/settings shows. The Telegram token and chat are not among it: they stay in the
// dashboard, and a browser learns only whether both are filled in. The record is closed to every
// browser, so the routes below read and write what this names and nothing else.
function view() {
  const found = record();
  const notices = {};
  NOTICES.forEach((name) => {
    notices[name] = found ? found.getBool(name) : true;
  });

  return {
    language: require(__hooks + '/lib/lang.js').language(),
    languages: choices('language'),
    accent: (found && found.getString('accent')) || 'none',
    accents: choices('accent'),
    notices: notices,
    telegram: Boolean(found && found.getString('telegram_token').trim() && found.getString('telegram_chat_id').trim()),
  };
}

// GET /api/shop/admin/settings
function read(e) {
  return e.json(200, view());
}

// POST /api/shop/admin/settings — any of language, accent and notices; what is left out stays as
// it was. Everything follows at once: lib/site.js writes the language and the colour into
// index.html on every load, and the rest is read on every use.
function save(e) {
  const lang = require(__hooks + '/lib/lang.js').open();
  const body = e.requestInfo().body || {};

  // The one record, made again should somebody have deleted it in the dashboard, as a shop
  // without it behaved: English, in ink, every notice on.
  let found = record();
  if (!found) {
    found = new Record($app.findCollectionByNameOrId('shop_settings'));
    found.set('language', 'en');
    found.set('accent', 'none');
    NOTICES.forEach((name) => found.set(name, true));
  }

  if (body.language !== undefined) {
    const language = String(body.language);
    if (choices('language').indexOf(language) === -1) {
      throw new BadRequestError(lang.t('settings.noSuchLanguage'));
    }
    found.set('language', language);
  }

  if (body.accent !== undefined) {
    const accent = String(body.accent);
    if (choices('accent').indexOf(accent) === -1) {
      throw new BadRequestError(lang.t('settings.noSuchAccent'));
    }
    found.set('accent', accent);
  }

  if (body.notices) {
    NOTICES.forEach((name) => {
      if (body.notices[name] !== undefined) found.set(name, body.notices[name] === true);
    });
  }

  $app.save(found);

  return e.json(200, view());
}

module.exports = { on, choices, view, read, save };
