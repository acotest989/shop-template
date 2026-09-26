/// <reference path="../pb_data/types.d.ts" />

// What an admin changes at /admin/settings: for now, the shop's language. The `shop_settings`
// record is closed to every browser and holds the Telegram token as well, so these routes read
// and write the one field they name and nothing else.
//
// Everything lives inside each handler, for the reason given in orders.pb.js.
routerAdd('GET', '/api/shop/admin/settings', (e) => {
  const lang = require(__hooks + '/lang.js').open();

  if (!e.auth.getBool('admin')) {
    throw new ForbiddenError(lang.t('settings.onlyShop'));
  }

  // The choices are the field's own, so a language added by a migration shows up here by itself.
  const values = $app.findCollectionByNameOrId('shop_settings').fields.getByName('language').values;
  const languages = [];
  for (let i = 0; i < values.length; i++) languages.push(String(values[i]));

  return e.json(200, { language: lang.language, languages: languages });
}, $apis.requireAuth('users'));

// The pages, the mails, the hooks' messages and Telegram all follow at once: site.pb.js writes
// the language into index.html on every load, and lang.js reads it on every use.
routerAdd('POST', '/api/shop/admin/settings', (e) => {
  const lang = require(__hooks + '/lang.js').open();

  if (!e.auth.getBool('admin')) {
    throw new ForbiddenError(lang.t('settings.onlyShop'));
  }

  const language = String((e.requestInfo().body || {}).language || '');
  const collection = $app.findCollectionByNameOrId('shop_settings');

  const values = collection.fields.getByName('language').values;
  let known = false;
  for (let i = 0; i < values.length; i++) {
    if (String(values[i]) === language) known = true;
  }
  if (!known) {
    throw new BadRequestError(lang.t('settings.noSuchLanguage'));
  }

  // The one record, made again should somebody have deleted it in the dashboard, with the
  // owner's notices on, as a shop without the record had them.
  let record;
  try {
    record = $app.findFirstRecordByFilter('shop_settings', 'id != ""');
  } catch (err) {
    record = new Record(collection);
    ['mail_questions', 'mail_orders', 'telegram_questions', 'telegram_orders'].forEach((name) => record.set(name, true));
  }

  record.set('language', language);
  $app.save(record);

  return e.json(200, { language: language });
}, $apis.requireAuth('users'));
