/// <reference path="../pb_data/types.d.ts" />

// The shop's accent colour, chosen at /admin/settings instead of written into index.html by hand:
// server/pb_hooks/site.pb.js puts it on <html> as data-accent on every load. The colours are in
// assets/theme.css; `none` leaves the shop in ink, as it ships.
migrate(
  (app) => {
    const settings = app.findCollectionByNameOrId('shop_settings');

    settings.fields.add(new SelectField({
      name: 'accent',
      values: ['none', 'violet', 'indigo', 'teal', 'orange', 'lime'],
      maxSelect: 1,
      required: true,
      help: 'The colour of buttons, links, the cart count and focus; none is ink. Also set in the admin area, under Settings.',
    }));

    app.save(settings);

    for (const record of app.findAllRecords('shop_settings')) {
      record.set('accent', 'none');
      app.save(record);
    }
  },
  (app) => {
    const settings = app.findCollectionByNameOrId('shop_settings');
    settings.fields.removeByName('accent');
    app.save(settings);
  },
);
