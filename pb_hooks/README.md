# Hooks

Server-side logic in JavaScript. PocketBase runs it in its embedded engine — not Node — from the `*.pb.js` files at the top of this directory, and only those.

This is where anything the client must not decide belongs. The obvious one: never let a browser post the amount it intends to pay. Price the order here, from the records, and reject what does not match. `lib/orders.js` is that, in full. The `orders` collection refuses every write, and the shop adds a route of its own instead — a browser sends which products at which quantity, and the price, stock, totals and the buyer's account are all settled on this side. A route rather than a create hook, because then the collection can stay closed: there is no second way in to keep in step.

## One list, and the code it points to

`shop.pb.js` is everything the shop adds to PocketBase, one line each — middleware, routes, the record hook, the mail events, the scheduled job — and nothing else:

```js
routerAdd('POST', '/api/shop/orders', (e) => require(__hooks + '/lib/orders.js').place(e));
```

The code is in `lib/`, a module per topic:

| File | What it does |
|---|---|
| `lib/orders.js` | places an order, lets an admin set its status and payment, and puts stock back when an order is cancelled or returned |
| `lib/chat.js` | takes a question from the chat on a product page, and hands a guest's questions to the account they sign in with |
| `lib/inbox.js` | the admin's replies and deletions, and the job that mails a customer a reply they have not seen |
| `lib/products.js` | saves a product from the admin area |
| `lib/settings.js` | the owner's switches, and what `/admin/settings` reads and saves: the shop's language, its accent colour and the owner's notices |
| `lib/mail.js` | puts `mail/` in place of PocketBase's own account mails, and serves `/admin/mail` its previews and tests |
| `lib/site.js` | the shop's files as the world gets them: no-cache, `index.html` in the shop's language and colour with a product's own title, description, picture and schema.org data on its page, `/sitemap.xml` and `/robots.txt` |
| `lib/guard.js` | the one check in front of everything under `/api/shop/admin/`: an account with `admin` ticked |
| `lib/mailer.js` | fills a template from `mail/` and sends it |
| `lib/lang.js` | the shop's language on this side: a sentence from `lang/`, money and durations as that language writes them |
| `lib/telegram.js` | a message to the owner's phone |

Why the split: a handler in a `.pb.js` file runs in a runtime of its own, without the file around it, so a helper declared beside it is missing when it runs. A module taken in with `require()` is ordinary CommonJS, and its functions share what they like — a constant, a check, the owner's switches — instead of each handler carrying its own copy. The price is one `require()` per line in `shop.pb.js`, and PocketBase caches the module after the first.

The admin area's routes all live under `/api/shop/admin/`, and `lib/guard.js` turns away anybody without `admin` before any of them runs, with one sentence in the shop's language. A new admin route goes under that path and needs nothing else.

## Writing here

The engine is goja: ES5 plus most of ES6, CommonJS only (no ES modules without pre-bundling), no `setTimeout`, no `fetch` (`$http.send` does its job, as in `lib/telegram.js`), no Node APIs.

No code here writes a sentence a person reads. It asks `lib/lang.js` for one, in the language set in `shop_settings`: `lang.t('order.priceChanged', { title: title })`, from `lang/<language>.json`. A new message is a key in `lang/en.json` and in every other file there; the syntax is the pages' own, in `pb_public/lang/README.md`. The mails are templates in `mail/`, with a README of their own.

Two things that cost an afternoon if nobody says them: the extension of a file PocketBase should run really must be `.pb.js`, and routes are registered when the server starts. The file watcher does not reliably restart it, so restart it yourself after changing anything here — `lib/` included, since a module is read once.

A scheduled job and a transaction across collections are both fine here: `cronAdd` runs the reply mail every minute, and `$app.runInTransaction` takes an order and its stock together. When the code needs a real library or cryptography the engine does not have — signing web push is one — that is the signal to import PocketBase as a Go module and add routes in your own `main.go` instead. Same binary, same database, no migration.
