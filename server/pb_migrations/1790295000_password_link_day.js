/// <reference path="../pb_data/types.d.ts" />

// A password link good for a day instead of PocketBase's 30 minutes. The order confirmation
// carries one for the account checkout opens for a guest, and a buyer reads that mail when the
// parcel is on its way, not in the half hour after ordering. The link from Forgot? runs as long,
// which is still a day's window on an inbox somebody else would have to be reading. The mails say
// how long, from this very setting.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    users.passwordResetToken.duration = 86400;
    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    users.passwordResetToken.duration = 1800;
    app.save(users);
  },
);
