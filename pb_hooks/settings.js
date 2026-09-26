/// <reference path="../pb_data/types.d.ts" />

// The owner's settings, for any hook that has to ask before telling the owner something, and for
// /admin/settings. Not a hook itself, like telegram.js beside it: a handler takes it in with
// require(__hooks + '/settings.js').

// The owner's notices, as the record names them: mail and Telegram, for questions and orders.
const NOTICES = ['mail_questions', 'mail_orders', 'telegram_questions', 'telegram_orders'];

const record = () => {
  try {
    return $app.findFirstRecordByFilter('shop_settings', 'id != ""');
  } catch (err) {
    return null; // deleted in the dashboard
  }
};

module.exports = {
  NOTICES,

  // Whether a switch in the one record of `shop_settings` is on. With no record at all, every
  // switch counts as on: that is how the shop behaved before it had any.
  on(name) {
    const found = record();
    return found ? found.getBool(name) : true;
  },

  // The values a select field of `shop_settings` offers, so a language or a colour added by a
  // migration is a choice everywhere without a list to keep in step.
  choices(name) {
    const values = $app.findCollectionByNameOrId('shop_settings').fields.getByName(name).values;
    const list = [];
    for (let i = 0; i < values.length; i++) list.push(String(values[i]));
    return list;
  },

  // What /admin/settings shows. The Telegram token and chat are not among it: they stay in the
  // dashboard, and a browser learns only whether both are filled in.
  view() {
    const found = record();
    const notices = {};
    NOTICES.forEach((name) => {
      notices[name] = found ? found.getBool(name) : true;
    });

    return {
      language: require(__hooks + '/lang.js').language(),
      languages: this.choices('language'),
      accent: (found && found.getString('accent')) || 'none',
      accents: this.choices('accent'),
      notices: notices,
      telegram: Boolean(found && found.getString('telegram_token').trim() && found.getString('telegram_chat_id').trim()),
    };
  },
};
