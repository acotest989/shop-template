/// <reference path="../pb_data/types.d.ts" />

// `language` in `shop_settings` now decides the pages as well: server/pb_hooks/site.pb.js writes
// it into index.html on every load, and an admin sets it at /admin/settings. Only the help text
// under the field in the dashboard changes, which still told whoever read it to edit index.html
// to match.
migrate(
  (app) => {
    const settings = app.findCollectionByNameOrId('shop_settings');
    settings.fields.getByName('language').help =
      'The shop\'s language: its pages, mails, messages and Telegram. Also set in the admin area, under Settings.';
    app.save(settings);
  },
  (app) => {
    const settings = app.findCollectionByNameOrId('shop_settings');
    settings.fields.getByName('language').help =
      'The language of the mails and the server\'s messages. Set index.html to the same one: lang/README.md.';
    app.save(settings);
  },
);
