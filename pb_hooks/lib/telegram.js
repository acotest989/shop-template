/// <reference path="../../pb_data/types.d.ts" />

// A message to the owner's own Telegram chat, for any code with something to tell them, which
// takes this in with require(__hooks + '/lib/telegram.js').
//
// The bot's token and the chat to write to are the one record in `shop_settings`, filled in the
// dashboard. Either one empty, and nothing is sent. A failure is logged and goes no further: a
// question or an order stands whether or not the owner's phone hears of it.
module.exports = {
  send(text) {
    let token = '';
    let chat = '';
    try {
      const settings = $app.findFirstRecordByFilter('shop_settings', 'id != ""');
      token = settings.getString('telegram_token').trim();
      chat = settings.getString('telegram_chat_id').trim();
    } catch (err) {
      return; // no settings record at all
    }
    if (!token || !chat) return;

    // The token is part of the address, and a network error quotes the address. The log gets
    // the error without it.
    const safe = (value) => String(value).split(token).join('<token>');

    try {
      const res = $http.send({
        url: 'https://api.telegram.org/bot' + token + '/sendMessage',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, text: text, link_preview_options: { is_disabled: true } }),
        timeout: 5, // seconds, and short on purpose: the visitor who asked is waiting on this
      });

      if (res.statusCode !== 200) {
        const reason = res.json && res.json.description ? res.json.description : 'status ' + res.statusCode;
        $app.logger().error('telegram message failed', 'reason', safe(reason));
      }
    } catch (err) {
      $app.logger().error('telegram message failed', 'error', safe(err));
    }
  },
};
