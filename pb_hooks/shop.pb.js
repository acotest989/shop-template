/// <reference path="../pb_data/types.d.ts" />

// Everything the shop adds to PocketBase, one line each: the middleware in front of every
// request, the routes, the record hook, the mail events and the scheduled job. What each one does
// is in pb_hooks/lib/, in the file it names.
//
// A handler here runs in a runtime of its own and cannot see this file around it, so each one
// takes its module in with require() when it is called rather than sharing a variable declared
// out here. Inside lib/, modules are ordinary CommonJS and share what they like.

// --- In front of every request ---

// The shop's files: no-cache, and index.html in the shop's language and colour, with what search
// engines read.
routerUse((e) => require(__hooks + '/lib/site.js').serve(e));

// Everything under /api/shop/admin/ is an admin's alone.
routerUse((e) => require(__hooks + '/lib/guard.js').admin(e));

// --- For search engines ---

routerAdd('GET', '/sitemap.xml', (e) => require(__hooks + '/lib/site.js').sitemap(e));
routerAdd('GET', '/robots.txt', (e) => require(__hooks + '/lib/site.js').robots(e));

// --- For customers and guests ---

routerAdd('POST', '/api/shop/orders', (e) => require(__hooks + '/lib/orders.js').place(e));

routerAdd('POST', '/api/shop/chat', (e) => require(__hooks + '/lib/chat.js').ask(e));
routerAdd('POST', '/api/shop/chat/seen', (e) => require(__hooks + '/lib/chat.js').seen(e), $apis.requireAuth('users'));
routerAdd('POST', '/api/shop/chat/claim', (e) => require(__hooks + '/lib/chat.js').claim(e), $apis.requireAuth('users'));

// --- For the admin area ---

routerAdd('POST', '/api/shop/admin/orders/update', (e) => require(__hooks + '/lib/orders.js').update(e));
routerAdd('POST', '/api/shop/admin/products/save', (e) => require(__hooks + '/lib/products.js').save(e));

routerAdd('POST', '/api/shop/admin/inbox/reply', (e) => require(__hooks + '/lib/inbox.js').reply(e));
routerAdd('POST', '/api/shop/admin/inbox/answered', (e) => require(__hooks + '/lib/inbox.js').answered(e));
routerAdd('POST', '/api/shop/admin/inbox/delete', (e) => require(__hooks + '/lib/inbox.js').remove(e));
routerAdd('POST', '/api/shop/admin/inbox/clear', (e) => require(__hooks + '/lib/inbox.js').clear(e));

routerAdd('GET', '/api/shop/admin/mail', (e) => require(__hooks + '/lib/mail.js').list(e));
routerAdd('GET', '/api/shop/admin/mail/{name}', (e) => require(__hooks + '/lib/mail.js').preview(e));
routerAdd('POST', '/api/shop/admin/mail/{name}/test', (e) => require(__hooks + '/lib/mail.js').test(e));

routerAdd('GET', '/api/shop/admin/settings', (e) => require(__hooks + '/lib/settings.js').read(e));
routerAdd('POST', '/api/shop/admin/settings', (e) => require(__hooks + '/lib/settings.js').save(e));

// --- Records, mails and time ---

// Every save of an order, the dashboard's included: cancelled and returned put goods back.
onRecordUpdate((e) => require(__hooks + '/lib/orders.js').restock(e), 'orders');

// PocketBase's own account mails, sent from pb_hooks/mail/ like every other.
onMailerRecordVerificationSend((e) => require(__hooks + '/lib/mail.js').verification(e), 'users');
onMailerRecordPasswordResetSend((e) => require(__hooks + '/lib/mail.js').passwordReset(e), 'users');
onMailerRecordEmailChangeSend((e) => require(__hooks + '/lib/mail.js').emailChange(e), 'users');
onMailerRecordAuthAlertSend((e) => require(__hooks + '/lib/mail.js').authAlert(e), 'users');

// Every minute: a mail to each customer with a reply they have not seen for five minutes.
cronAdd('chat_reply_mail', '* * * * *', () => require(__hooks + '/lib/inbox.js').mailReplies());
