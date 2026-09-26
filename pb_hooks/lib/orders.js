/// <reference path="../../pb_data/types.d.ts" />

// Orders: placing one, an admin moving one along, and the stock that follows either. The routes
// and the record hook that call these are in pb_hooks/shop.pb.js.
//
// Placing an order is the one thing a browser may ask for and not describe. The cart sends what
// it was shown, and every amount written below is read from the catalogue instead. The `orders`
// collection is closed, so the route is the only way in.

// Card is off until a real provider is wired in. Refusing it here rather than only in the markup
// is the whole point: a disabled radio is a suggestion, and a POST naming 'card' would otherwise
// walk away with an order marked paid that nobody paid for. Turning it back on is this line and
// `cardPayment` in pb_public/pages/shop/checkout.js.
const CARD_PAYMENT = false;

// Ten of one product is more than a household orders, and it bounds what a single made-up
// cash-on-delivery order can take off a shelf: the rate limit counts orders, this counts what is
// in them. The cart stops at the same number, in pb_public/stores/cart.js.
const MAX_QTY = 10;

// One flat rate per order, in whatever currency the shop prices in: the courier charges by
// weight, but nearly every parcel comes to about this. An order worth FREE_FROM ships free as
// long as it weighs no more than FREE_UP_TO grams; past that the parcel costs more than free
// shipping can carry. The cart shows the same rules, in pb_public/stores/cart.js.
const SHIPPING = 1500;
const FREE_FROM = 30000;
const FREE_UP_TO = 20000;

const STATUSES = ['pending', 'shipped', 'delivered', 'returned', 'cancelled'];

// Timestamp and a few random characters. The reference is unique in the database, and two
// orders in the same millisecond would otherwise cost one of them the sale.
const newReference = () => {
  const stamp = Date.now().toString(36).toUpperCase();
  const salt = Math.random().toString(36).slice(2, 5).toUpperCase();
  return 'SH-' + stamp + salt;
};

// A guest still leaves an email, so every order has an owner and every buyer can find it again.
// An address that already has an account uses it rather than failing on the unique index — the
// password is random and goes nowhere; the buyer sets their own from the link in the
// confirmation.
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

// POST /api/shop/orders
function place(e) {
  // What a refusal says, the money in the mails and the Telegram message: lib/lang.js.
  const lang = require(__hooks + '/lib/lang.js').open();

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
    throw new BadRequestError(lang.t('order.incomplete'));
  }
  if (payment !== 'card' && payment !== 'cod') {
    throw new BadRequestError(lang.t('order.payment'));
  }
  if (payment === 'card' && !CARD_PAYMENT) {
    throw new BadRequestError(lang.t('order.noCard'));
  }
  if (!items.length) {
    throw new BadRequestError(lang.t('order.empty'));
  }

  let placed = null;
  let resetToken = '';

  // One transaction: an order that stands while its stock was never taken is worse than no
  // order at all.
  $app.runInTransaction((tx) => {
    const lines = [];
    const bought = [];
    const seen = [];
    let subtotal = 0;
    let currency = '';

    for (const item of items) {
      const qty = Number(item.qty);
      if (!Number.isInteger(qty) || qty < 1) {
        throw new BadRequestError(lang.t('order.quantity'));
      }

      // One line per product, the way the cart sends it. A second line would be checked against
      // stock the first has not taken yet, and would slip past the cap as well.
      const id = String(item.id);
      if (seen.indexOf(id) !== -1) {
        throw new BadRequestError(lang.t('order.twice'));
      }
      seen.push(id);

      let product;
      try {
        product = tx.findRecordById('products', id);
      } catch (err) {
        throw new BadRequestError(lang.t('order.oneGone'));
      }

      const title = product.getString('title');
      const price = product.getInt('price_cents');

      // Hidden in the admin area while it sat in somebody's cart.
      if (product.getBool('hidden')) {
        throw new BadRequestError(lang.t('order.gone', { title: title }));
      }

      // The cart's price is sent to be checked, never to be charged. Somebody who agreed to one
      // number must not be billed another without being told.
      if (Number(item.price) !== price) {
        throw new BadRequestError(lang.t('order.priceChanged', { title: title }));
      }
      if (qty > MAX_QTY) {
        throw new BadRequestError(lang.t('order.atMost', { n: MAX_QTY, title: title }));
      }
      if (product.getInt('stock') < qty) {
        throw new BadRequestError(lang.t('order.notEnough', { title: title }));
      }

      // One total cannot stand for two currencies.
      currency = currency || product.getString('currency');
      if (product.getString('currency') !== currency) {
        throw new BadRequestError(lang.t('order.currencies'));
      }

      lines.push({ id: product.id, handle: product.getString('handle'), title: title, price: price, qty: qty });
      bought.push({ product: product, qty: qty });
      subtotal += price * qty;
    }

    // Free for an order worth enough that stays light enough. A product nobody has weighed keeps
    // the whole order on the flat rate.
    let weight = 0;
    let weighed = true;
    for (const entry of bought) {
      const grams = entry.product.getInt('weight');
      if (grams <= 0) weighed = false;
      weight += grams * entry.qty;
    }
    const shipping = subtotal >= FREE_FROM && weighed && weight <= FREE_UP_TO ? 0 : SHIPPING;

    // The page sends the shipping it showed, for the same reason as the prices: so the buyer is
    // never charged more than that. Less is fine — a cart from before weights were kept cannot
    // promise free shipping, and finding it on the receipt hurts nobody.
    const shown = Number(body.shipping);
    if (!Number.isInteger(shown) || shown < shipping) {
      throw new BadRequestError(lang.t('order.shipping'));
    }

    const owner = info.auth && info.auth.id
      ? { record: info.auth, created: false }
      : findOrCreateUser(tx, email, name);

    // Minted here, while the record is at hand, and spent below in the confirmation: a buyer who
    // did not have an account gets one link that both proves the address is theirs and lets them
    // pick a password.
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

  // Mail is not part of the sale. A shop that refuses an order because its mail server stalled
  // is worse than one that misses a letter, so what follows can only be logged. How the owner
  // hears of it, mail, Telegram or both, is up to the switches in `shop_settings`.
  const settings = require(__hooks + '/lib/settings.js');

  try {
    sendMails(lang, placed, resetToken, settings.on('mail_orders'));
  } catch (err) {
    $app.logger().error('order mail failed', 'reference', placed.reference, 'error', String(err));
  }

  // The owner's phone, when the shop has a Telegram bot: lib/telegram.js.
  if (settings.on('telegram_orders')) {
    try {
      require(__hooks + '/lib/telegram.js').send(
        lang.t('telegram.order', { reference: placed.reference, total: lang.money(placed.total, placed.currency) }) + '\n' +
        placed.name + ', ' + placed.phone + '\n\n' +
        placed.lines.map((line) => line.title + ' × ' + line.qty).join('\n') + '\n\n' +
        lang.t(placed.paid ? 'telegram.paidByCard' : 'telegram.cod') + '\n' +
        $app.settings().meta.appURL + '/admin/orders',
      );
    } catch (err) {
      $app.logger().error('telegram message failed', 'reference', placed.reference, 'error', String(err));
    }
  }

  return e.json(200, placed);
}

// The buyer's letter and the shop's copy: order-confirmation.html and shop-new-order.html in
// pb_hooks/mail/, filled by lib/mailer.js. This only gathers what they show.
function sendMails(lang, order, token, shopCopy) {
  const mailer = require(__hooks + '/lib/mailer.js');
  const appURL = $app.settings().meta.appURL;

  const data = {
    reference: order.reference,
    name: order.name,
    email: order.email,
    phone: order.phone,
    address: order.address,
    lines: order.lines.map((line) => ({
      title: line.title,
      qty: line.qty,
      amount: lang.money(line.price * line.qty, order.currency),
    })),
    shipping: order.shipping ? lang.money(order.shipping, order.currency) : lang.t('order.free'),
    total: lang.money(order.total, order.currency),
    paid: order.paid,
    cod: order.payment === 'cod',

    // Only for an account nobody asked for: it exists so this order can be found again, and the
    // link is the only way into it. No password is ever sent. The link is a password reset
    // token, as long-lived as PocketBase makes those, and the mail says how long.
    passwordLink: token ? appURL + '/reset-password/' + token : '',
    validFor: token ? lang.duration($app.findCollectionByNameOrId('users').passwordResetToken.duration) : '',

    // Where the buyer finds the order again, and the shop finds it among the rest: a new one is
    // pending, at the top of that list.
    accountLink: appURL + '/account',
    ordersLink: appURL + '/admin/orders?status=pending',
  };

  // Each letter stands alone: an address that bounces must not take the other one down with it,
  // and the shop's copy is the one nobody else is watching for.
  const post = (name, to) => {
    try {
      mailer.send(name, data, to);
    } catch (err) {
      $app.logger().error('order mail failed', 'mail', name, 'reference', order.reference, 'error', String(err));
    }
  };

  post('order-confirmation', [{ address: order.email, name: order.name }]);

  // To the address the shop already sends from, so there is nothing extra to configure, and only
  // while its switch is on. The buyer's letter above goes either way.
  if (shopCopy) post('shop-new-order', [{ address: $app.settings().meta.senderAddress }]);
}

// POST /api/shop/admin/orders/update — an order's progress, set from /admin/orders: where it is,
// and whether the money arrived. Saving it runs restock below, so a status that puts goods back
// or takes them again does so here too, and a reopening the shelf cannot cover is refused.
function update(e) {
  const lang = require(__hooks + '/lib/lang.js').open();
  const body = e.requestInfo().body || {};

  let order;
  try {
    order = $app.findRecordById('orders', String(body.order || ''));
  } catch (err) {
    throw new NotFoundError(lang.t('orders.gone'));
  }

  if (body.status !== undefined) {
    const status = String(body.status);
    if (STATUSES.indexOf(status) === -1) {
      throw new BadRequestError(lang.t('orders.status'));
    }
    order.set('status', status);
  }

  if (body.paid !== undefined) {
    order.set('paid', body.paid === true);
  }

  $app.save(order);

  return e.json(200, order);
}

// Every save of an order: the route above, and the dashboard as well. Cancelled and returned put
// the goods back: one before they left, the other once the courier has brought them back.
// Placing an order only ever moves stock one way, so without this such an order would keep a
// shelf empty on nobody's behalf, and go on counting as a sale. Moving an order off either
// again, to correct a status set by mistake, takes the goods once more.
function restock(e) {
  const shelved = (status) => status === 'cancelled' || status === 'returned';
  const before = shelved(e.record.original().getString('status'));
  const after = shelved(e.record.getString('status'));

  // shipped to delivered, or cancelled to returned: the goods stay where they are
  if (before === after) {
    e.next();
    return;
  }

  const direction = after ? 1 : -1; // onto the shelf, or off it again
  const products = [];

  // Every line is settled before any is written, so a refusal leaves each shelf as it was.
  for (const line of JSON.parse(e.record.getString('lines'))) {
    // A product deleted from the dashboard has no shelf left to put anything on, and must not
    // keep its order stuck in the status it has. The admin area hides products instead.
    let product;
    try {
      product = e.app.findRecordById('products', line.id);
    } catch (err) {
      continue;
    }

    const stock = product.getInt('stock') + direction * line.qty;
    if (stock < 0) {
      const lang = require(__hooks + '/lib/lang.js').open();
      throw new BadRequestError(lang.t('orders.reopen', { title: product.getString('title') }));
    }
    product.set('stock', stock);
    product.set('sold', Math.max(0, product.getInt('sold') - direction * line.qty));
    products.push(product);
  }

  // Before the save, so a failure here takes the status change down with it rather than leaving
  // an order whose status and shelf disagree.
  for (const product of products) {
    e.app.save(product);
  }

  e.next();
}

module.exports = { place, update, restock };
