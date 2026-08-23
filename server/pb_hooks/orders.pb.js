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

  // Card is off until a real provider is wired in. Refusing it here rather than only in
  // the markup is the whole point: a disabled radio is a suggestion, and a POST naming
  // 'card' would otherwise walk away with an order marked paid that nobody paid for.
  // Turning it back on is this line and `cardPayment` in pages/checkout.js.
  const CARD_PAYMENT = false;

  if (!name || !email || !phone || !address) {
    throw new BadRequestError('The delivery details are incomplete.');
  }
  if (payment !== 'card' && payment !== 'cod') {
    throw new BadRequestError('Choose how you would like to pay.');
  }
  if (payment === 'card' && !CARD_PAYMENT) {
    throw new BadRequestError('Card payment is not available yet. Please choose cash on delivery.');
  }
  if (!items.length) {
    throw new BadRequestError('There is nothing in the cart.');
  }

  // Money as a person reads it. The app has toLocaleString; this engine does not.
  const money = (cents, currency) => (cents / 100).toFixed(2) + ' ' + currency;

  // The buyer writes their own name and address, and both end up inside markup we send
  // to ourselves. An unescaped angle bracket breaks the mail; a tag would do worse.
  const esc = (value) => String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Each letter stands alone: an address that bounces must not take the other one
  // down with it, and the shop's copy is the one nobody else is watching for.
  const post = (message, letter, reference) => {
    try {
      $app.newMailClient().send(message);
    } catch (err) {
      $app.logger().error('order mail failed', 'letter', letter, 'reference', reference, 'error', String(err));
    }
  };

  const sendMail = (order, token) => {
    const meta = $app.settings().meta;
    const from = { address: meta.senderAddress, name: meta.senderName };

    const rows = order.lines.map((line) =>
      '<tr><td>' + esc(line.title) + ' &times; ' + line.qty + '</td>' +
      '<td align="right">' + money(line.price * line.qty, order.currency) + '</td></tr>'
    ).join('');

    const summary =
      '<table cellpadding="4" style="border-collapse:collapse">' + rows +
      '<tr><td><strong>Total</strong></td><td align="right"><strong>' +
      money(order.total, order.currency) + '</strong></td></tr></table>' +
      '<p>Shipping to ' + esc(order.address) + '.</p>';

    const settled = order.paid
      ? '<p>Paid by card. Nothing is owed on delivery.</p>'
      : '<p>Please have ' + money(order.total, order.currency) + ' ready for the courier.</p>';

    // Only for an account nobody asked for: it exists so this order can be found again,
    // and the link is the only way into it. No password is ever sent.
    const welcome = token
      ? '<p>We have opened an account for ' + esc(order.email) + ' so you can find this order later. ' +
        '<a href="' + meta.appURL + '/reset-password/' + token + '">Choose a password</a>.</p>'
      : '';

    post(new MailerMessage({
      from: from,
      to: [{ address: order.email, name: order.name }],
      subject: 'Order ' + order.reference,
      html: '<p>Thank you, ' + esc(order.name) + '.</p><p>Reference <strong>' + order.reference +
        '</strong>.</p>' + summary + settled + welcome,
    }), 'buyer', order.reference);

    // To the address the shop already sends from, so there is nothing extra to configure.
    post(new MailerMessage({
      from: from,
      to: [{ address: meta.senderAddress }],
      subject: 'New order ' + order.reference + ' — ' + money(order.total, order.currency),
      html: '<p>' + esc(order.name) + ' &lt;' + esc(order.email) + '&gt;, ' + esc(order.phone) + '</p>' +
        summary + '<p>Paying by ' + (order.payment === 'cod' ? 'cash on delivery' : 'card') + '.</p>',
    }), 'shop', order.reference);
  };

  let placed = null;
  let resetToken = '';

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

    // Minted here, while the record is at hand, and spent below in the confirmation:
    // a buyer who did not have an account gets one link that both proves the address
    // is theirs and lets them pick a password.
    if (owner.created) resetToken = owner.record.newPasswordResetToken();

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
      phone: phone,
      address: address,
      lines: lines,
      currency: currency,
      subtotal: subtotal,
      shipping: shipping,
      total: subtotal + shipping,
      payment: payment,
      paid: order.getBool('paid'),
      status: order.getString('status'),
      created: order.getString('created'),
      accountCreated: owner.created,
    };
  });

  // Mail is not part of the sale. A shop that refuses an order because its mail server
  // stalled is worse than one that misses a letter, so this can only be logged.
  try {
    sendMail(placed, resetToken);
  } catch (err) {
    $app.logger().error('order mail failed', 'reference', placed.reference, 'error', String(err));
  }

  return e.json(200, placed);
});

// Cancelling puts the goods back. The route above only ever moves stock one way, so
// without this a cancelled order would keep a shelf empty on nobody's behalf, and go
// on counting as a sale. Fires for the dashboard too, which is the only place an
// order's status changes today.
onRecordUpdate((e) => {
  const before = e.record.original().getString('status');
  const after = e.record.getString('status');

  if (after !== 'cancelled' || before === 'cancelled') {
    e.next();
    return;
  }

  // Before the save, so a failure here takes the status change down with it rather
  // than leaving an order marked cancelled that nobody ever restocked.
  for (const line of JSON.parse(e.record.getString('lines'))) {
    const product = e.app.findRecordById('products', line.id);
    product.set('stock', product.getInt('stock') + line.qty);
    product.set('sold', Math.max(0, product.getInt('sold') - line.qty));
    e.app.save(product);
  }

  e.next();
}, 'orders');
