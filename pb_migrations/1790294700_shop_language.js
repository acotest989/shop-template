/// <reference path="../pb_data/types.d.ts" />

// The language the server speaks: the mails, what the hooks answer a page with, and the Telegram
// messages. The pages have their own, chosen in index.html, which the server never reads, so a
// shop sets both to the same one: lang/README.md. English here, as the template ships. Read by
// server/pb_hooks/lang.js.
migrate(
  (app) => {
    const settings = app.findCollectionByNameOrId('shop_settings');

    settings.fields.add(new SelectField({
      name: 'language',
      values: ['en', 'sr-Latn'],
      maxSelect: 1,
      required: true,
      help: 'The language of the mails and the server\'s messages. Set index.html to the same one: lang/README.md.',
    }));

    app.save(settings);

    for (const record of app.findAllRecords('shop_settings')) {
      record.set('language', 'en');
      app.save(record);
    }
  },
  (app) => {
    const settings = app.findCollectionByNameOrId('shop_settings');
    settings.fields.removeByName('language');
    app.save(settings);
  },
);
