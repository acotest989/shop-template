/// <reference path="../pb_data/types.d.ts" />

// The owner's switches, for any hook that has to ask before telling the owner something. Not a
// hook itself, like telegram.js beside it: a handler takes it in with
// require(__hooks + '/settings.js').
module.exports = {
  // Whether a switch in the one record of `shop_settings` is on. With no record at all, every
  // switch counts as on: that is how the shop behaved before it had any.
  on(name) {
    try {
      return $app.findFirstRecordByFilter('shop_settings', 'id != ""').getBool(name);
    } catch (err) {
      return true;
    }
  },
};
