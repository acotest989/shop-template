# Hooks

Server-side logic in JavaScript, as `*.pb.js` files. PocketBase picks them up from this directory, and they run in its embedded engine — not Node.

This is where anything the client must not decide belongs. The obvious one: never let a browser post the amount it intends to pay. Price the order here, from the records, and reject what does not match.

`orders.pb.js` is that, in full. The `orders` collection refuses every write, and the hook adds a route of its own instead — a browser sends which products at which quantity, and the price, stock, totals and the buyer's account are all settled on this side:

```js
routerAdd('POST', '/api/shop/orders', (e) => {
  const product = tx.findRecordById('products', item.id);
  if (Number(item.price) !== product.getInt('price_cents')) { /* refuse */ }
});
```

A route rather than a create hook, because then the collection can stay closed: there is no second way in to keep in step.

| File | What it does |
|---|---|
| `orders.pb.js` | places an order, lets an admin set its status and payment, and puts stock back when an order is cancelled or returned |
| `chat.pb.js` | takes a question from the chat on a product page, and hands a guest's questions to the account they sign in with |
| `inbox.pb.js` | the admin's replies and deletions, and the job that mails a customer a reply they have not seen |
| `products.pb.js` | saves a product from the admin area |
| `mail.pb.js` | puts `server/mail/` in place of PocketBase's own account mails, and serves `/admin/mail` its previews and tests |
| `cache.pb.js` | tells browsers to check the shop's files before using a cached copy |
| `private.pb.js` | keeps `server/` and dotfiles out of what `--publicDir=..` serves |
| `mailer.js`, `settings.js`, `telegram.js` | not hooks: code the hooks above share |

The engine is goja: ES5 plus most of ES6, CommonJS only (no ES modules without pre-bundling), no `setTimeout`, no `fetch` (`$http.send` does its job, as in `telegram.js`), no Node APIs. Each handler runs isolated, so variables declared outside one are not visible inside it — a helper defined at the top of the file is missing at call time, which is why everything in `orders.pb.js` sits inside its handler.

Code two hooks share goes in a file without the `.pb.js`, which PocketBase does not load on its own: `mailer.js`, `settings.js` and `telegram.js` are that, and a handler takes one in with `require(__hooks + '/telegram.js')`, from inside itself like everything else.

Two things that cost an afternoon if nobody says them: the extension really must be `.pb.js`, and routes are registered when the server starts. The file watcher does not reliably restart it, so restart it yourself after adding or renaming a hook.

A scheduled job and a transaction across collections are both fine here: `cronAdd` runs the reply mail in `inbox.pb.js` every minute, and `$app.runInTransaction` takes an order and its stock together. When a hook grows past a few hundred lines, or needs a real library or cryptography the engine does not have — signing web push is one — that is the signal to import PocketBase as a Go module and add routes in your own `main.go` instead. Same binary, same database, no migration.
