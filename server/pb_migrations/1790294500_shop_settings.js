/// <reference path="../pb_data/types.d.ts" />

// What the shop has to know and this repository must never hold: for now, the Telegram bot
// that tells the owner about a new question or order. One record, made here empty and filled
// in the dashboard. Closed to every request but a superuser's, so the token saved in it is read
// by server/pb_hooks/telegram.js and nothing else.
migrate(
  (app) => {
    const settings = new Collection({
      type: 'base',
      name: 'shop_settings',

      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,

      // The help texts show under each field in the dashboard, where the two get filled in.
      fields: [
        {
          name: 'telegram_token',
          type: 'text',
          help: 'From @BotFather, like 1234567890:AAH…. It is the bot\'s password: it goes here and nowhere else.',
        },
        {
          name: 'telegram_chat_id',
          type: 'text',
          help: 'Press Start in a chat with the bot, then open api.telegram.org/bot<token>/getUpdates: the number after "chat":{"id":',
        },
        { name: 'created', type: 'autodate', onCreate: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    app.save(settings);

    // Empty: nothing is sent until both fields are filled.
    app.save(new Record(settings));
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('shop_settings'));
  },
);
