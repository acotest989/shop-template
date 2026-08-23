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

The engine is goja: ES5 plus most of ES6, CommonJS only (no ES modules without pre-bundling), no `setTimeout`, no `fetch`, no Node APIs. Each handler runs isolated, so variables declared outside one are not visible inside it — a helper defined at the top of the file is missing at call time, which is why everything in `orders.pb.js` sits inside its handler.

Two things that cost an afternoon if nobody says them: the extension really must be `.pb.js`, and routes are registered when the server starts. The file watcher does not reliably restart it, so restart it yourself after adding or renaming a hook.

When a hook grows past a few hundred lines, or needs a real library, a scheduled job or a transaction across collections, that is the signal to import PocketBase as a Go module and add routes in your own `main.go` instead. Same binary, same database, no migration.
