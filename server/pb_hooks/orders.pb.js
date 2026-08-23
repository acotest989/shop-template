/// <reference path="../pb_data/types.d.ts" />

// Placing an order is the one thing a browser may ask for and not describe. The cart
// sends what it was shown, and every amount written below is read from the catalogue
// instead. The `orders` collection is closed, so this route is the only way in.
//
// Everything lives inside the handler: it runs in a runtime of its own and cannot see
// the file around it, so a helper declared out there would be missing at call time.
routerAdd('POST', '/api/shop/orders', (e) => {
  // Timestamp and a few random characters. The reference is unique in the database,
  // and two orders in the same millisecond would otherwise cost one of them the sale.
  const newReference = () => {
    const stamp = Date.now().toString(36).toUpperCase();
    const salt = Math.random().toString(36).slice(2, 5).toUpperCase();
    return 'SH-' + stamp + salt;
  };

  // A guest still leaves an email, so every order has an owner and every buyer can
  // find it again. An address that already has an account uses it rather than failing
  // on the unique index — the password is random and goes nowhere; the buyer sets
  // their own from the link in the confirmation.
  const findOrCreateUser = (tx, email, name) => {
    try {
      return { record: tx.findAuthRecordByEmail('users', email), created: false };
    } catch (err) {
      // no account yet, which is the ordinary case for a guest
    }

    const record = new Record(tx.findCollectionByNameOrId('users'));
    record.set('email', email);
    record.set('name', name);
    record.setRandomPassword();
    tx.save(record);

    return { record: record, created: true };
  };

  const info = e.requestInfo();
  const body = info.body || {};
  const customer = body.customer || {};
  const items = body.items || [];

  const name = String(customer.name || '').trim();
  const email = String(customer.email || '').trim().toLowerCase();
  const phone = String(customer.phone || '').trim();
  const address = String(customer.address || '').trim();
  const payment = String(body.payment || '');

  if (!name || !email || !phone || !address) {
    throw new BadRequestError('The delivery details are incomplete.');
  }
  if (payment !== 'card' && payment !== 'cod') {
    throw new BadRequestError('Choose how you would like to pay.');
  }
  if (!items.length) {
    throw new BadRequestError('There is nothing in the cart.');
  }

  let placed = null;

  // One transaction: an order that stands while its stock was never taken is worse
  // than no order at all.
  $app.runInTransaction((tx) => {
    const lines = [];
    const bought = [];
    let subtotal = 0;
    let currency = '';

    for (const item of items) {
      const qty = Number(item.qty);
      if (!Number.isInteger(qty) || qty < 1) {
        throw new BadRequestError('That is not a quantity.');
      }

      let product;
      try {
        product = tx.findRecordById('products', String(item.id));
      } catch (err) {
        throw new BadRequestError('One of these products is no longer sold.');
      }

      const title = product.getString('title');
      const price = product.getInt('price_cents');

      // The cart's price is sent to be checked, never to be charged. Somebody who
      // agreed to one number must not be billed another without being told.
      if (Number(item.price) !== price) {
        throw new BadRequestError('The price of ' + title + ' changed while it was in your cart.');
      }
      if (product.getInt('stock') < qty) {
        throw new BadRequestError(title + ' does not have that many left.');
      }

      // One total cannot stand for two currencies.
      currency = currency || product.getString('currency');
      if (product.getString('currency') !== currency) {
        throw new BadRequestError('These products are not priced in the same currency.');
      }

      lines.push({ id: product.id, handle: product.getString('handle'), title: title, price: price, qty: qty });
      bought.push({ product: product, qty: qty });
      subtotal += price * qty;
    }

    const shipping = 0; // the demo ships free; a real shop would price it here
    const owner = info.auth && info.auth.id
      ? { record: info.auth, created: false }
      : findOrCreateUser(tx, email, name);

    const order = new Record(tx.findCollectionByNameOrId('orders'));
    order.set('reference', newReference());
    order.set('user', owner.record.id);
    order.set('name', name);
    order.set('email', email);
    order.set('phone', phone);
    order.set('address', address);
    order.set('lines', lines);
    order.set('currency', currency);
    order.set('subtotal', subtotal);
    order.set('shipping', shipping);
    order.set('total', subtotal + shipping);
    order.set('payment', payment);
    order.set('paid', payment === 'card'); // cash is collected at the door, not here
    order.set('status', 'pending');
    tx.save(order);

    for (const entry of bought) {
      entry.product.set('stock', entry.product.getInt('stock') - entry.qty);
      entry.product.set('sold', entry.product.getInt('sold') + entry.qty);
      tx.save(entry.product);
    }

    placed = {
      reference: order.getString('reference'),
      name: name,
      email: email,
      lines: lines,
      currency: currency,
      subtotal: subtotal,
      shipping: shipping,
      total: subtotal + shipping,
      payment: payment,
      paid: order.getBool('paid'),
      accountCreated: owner.created,
    };
  });

  return e.json(200, placed);
});
