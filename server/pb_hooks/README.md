# Hooks

Server-side logic in JavaScript, as `*.pb.js` files. PocketBase picks them up from this directory, and they run in its embedded engine — not Node.

This is where anything the client must not decide belongs. The obvious one: never let a browser post the amount it intends to pay. Price the order here, from the records, and reject what does not match.

```js
// example.pb.js
onRecordCreateRequest((e) => {
  e.record.set('total', 0); // computed here, never taken from the request
  e.next();
}, 'orders');
```

The engine is goja: ES5 plus most of ES6, CommonJS only (no ES modules without pre-bundling), no `setTimeout`, no `fetch`, no Node APIs. Each handler runs isolated, so variables declared outside one are not visible inside it.

When a hook grows past a few hundred lines, or needs a real library, a scheduled job or a transaction across collections, that is the signal to import PocketBase as a Go module and add routes in your own `main.go` instead. Same binary, same database, no migration.
