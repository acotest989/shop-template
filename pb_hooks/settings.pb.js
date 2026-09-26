/// <reference path="../pb_data/types.d.ts" />

// What an admin changes at /admin/settings: the shop's language, its accent colour, and which of
// the owner's notices go out. The `shop_settings` record is closed to every browser and holds the
// Telegram token as well, so these routes read and write the fields they name and nothing else:
// pb_hooks/settings.js says which.
//
// Everything lives inside each handler, for the reason given in orders.pb.js.
routerAdd('GET', '/api/shop/admin/settings', (e) => {
  if (!e.auth.getBool('admin')) {
    throw new ForbiddenError(require(__hooks + '/lang.js').open().t('settings.onlyShop'));
  }

  return e.json(200, require(__hooks + '/settings.js').view());
}, $apis.requireAuth('users'));

// Any of language, accent and notices; what is left out stays as it was. Everything follows at
// once: site.pb.js writes the language and the colour into index.html on every load, and the
// hooks read the rest on every use.
routerAdd('POST', '/api/shop/admin/settings', (e) => {
  const lang = require(__hooks + '/lang.js').open();
  const settings = require(__hooks + '/settings.js');

  if (!e.auth.getBool('admin')) {
    throw new ForbiddenError(lang.t('settings.onlyShop'));
  }

  const body = e.requestInfo().body || {};
  const collection = $app.findCollectionByNameOrId('shop_settings');

  // The one record, made again should somebody have deleted it in the dashboard, as a shop
  // without it behaved: English, in ink, every notice on.
  let record;
  try {
    record = $app.findFirstRecordByFilter('shop_settings', 'id != ""');
  } catch (err) {
    record = new Record(collection);
    record.set('language', 'en');
    record.set('accent', 'none');
    settings.NOTICES.forEach((name) => record.set(name, true));
  }

  if (body.language !== undefined) {
    const language = String(body.language);
    if (settings.choices('language').indexOf(language) === -1) {
      throw new BadRequestError(lang.t('settings.noSuchLanguage'));
    }
    record.set('language', language);
  }

  if (body.accent !== undefined) {
    const accent = String(body.accent);
    if (settings.choices('accent').indexOf(accent) === -1) {
      throw new BadRequestError(lang.t('settings.noSuchAccent'));
    }
    record.set('accent', accent);
  }

  if (body.notices) {
    settings.NOTICES.forEach((name) => {
      if (body.notices[name] !== undefined) record.set(name, body.notices[name] === true);
    });
  }

  $app.save(record);

  return e.json(200, settings.view());
}, $apis.requireAuth('users'));
