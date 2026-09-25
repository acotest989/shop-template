/// <reference path="../pb_data/types.d.ts" />

// Which of the two tells the owner what: a mail to the shop's own address, a Telegram message,
// or both, separately for chat questions and for orders. Switches in the one record of
// `shop_settings`, all on here, so nothing changes until the owner turns one off. The mails that
// go to customers are not among them. Read by server/pb_hooks/settings.js.
migrate(
  (app) => {
    const settings = app.findCollectionByNameOrId('shop_settings');

    settings.fields.add(new BoolField({
      name: 'mail_questions',
      help: 'Mail the shop\'s own address when a chat question starts waiting for an answer.',
    }));
    settings.fields.add(new BoolField({
      name: 'mail_orders',
      help: 'Mail the shop\'s own address a copy of every new order. The buyer\'s confirmation goes either way.',
    }));
    settings.fields.add(new BoolField({
      name: 'telegram_questions',
      help: 'A Telegram message when a chat question starts waiting for an answer.',
    }));
    settings.fields.add(new BoolField({
      name: 'telegram_orders',
      help: 'A Telegram message for every new order.',
    }));

    app.save(settings);

    for (const record of app.findAllRecords('shop_settings')) {
      record.set('mail_questions', true);
      record.set('mail_orders', true);
      record.set('telegram_questions', true);
      record.set('telegram_orders', true);
      app.save(record);
    }
  },
  (app) => {
    const settings = app.findCollectionByNameOrId('shop_settings');
    settings.fields.removeByName('mail_questions');
    settings.fields.removeByName('mail_orders');
    settings.fields.removeByName('telegram_questions');
    settings.fields.removeByName('telegram_orders');
    app.save(settings);
  },
);
