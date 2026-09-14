/// <reference path="../pb_data/types.d.ts" />

// A question from the chat on a product page: one of the shop's own, picked from the list,
// or one the visitor wrote. The chat collections are closed, so this route is the only way
// in, and nothing here reads a conversation back.
//
// Everything lives inside the handler, for the reason given in orders.pb.js.
routerAdd('POST', '/api/shop/chat', (e) => {
  // What a guest may write before an account is the way on, which is also the only way to
  // read a reply. Picking from the list is free. stores/chat.js shows the same numbers.
  const GUEST_QUESTIONS = 3;
  const MAX_LENGTH = 500;

  // The id the browser made for itself with crypto.randomUUID(). It tells the shop the same
  // visitor came back; it is never taken as proof of who they are.
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  const info = e.requestInfo();
  const body = info.body || {};

  const visitor = String(body.visitor || '').toLowerCase();
  const productId = String(body.product || '');
  const faqId = String(body.faq || '');
  const text = String(body.body || '').trim();

  // A signed-in customer, and not a superuser trying the shop in the dashboard's session.
  const user = info.auth && info.auth.collection().name === 'users' ? info.auth : null;

  if (!UUID.test(visitor)) {
    throw new BadRequestError('This browser has no visitor id. Reload the page and try again.');
  }
  if (!faqId === !text) {
    throw new BadRequestError('Pick a question from the list or write one.');
  }
  if (text.length > MAX_LENGTH) {
    throw new BadRequestError('A question can be at most ' + MAX_LENGTH + ' characters.');
  }

  let left = null;

  $app.runInTransaction((tx) => {
    let product;
    try {
      product = tx.findRecordById('products', productId);
    } catch (err) {
      throw new BadRequestError('This product is no longer sold.');
    }

    let faq = null;
    if (faqId) {
      try {
        faq = tx.findRecordById('faqs', faqId);
      } catch (err) {
        // gone from the dashboard since the list was loaded
      }
      if (!faq || !faq.getBool('active')) {
        throw new BadRequestError('That question is no longer on the list.');
      }
    }

    // Counted by visitor id, so clearing the browser's storage starts over. The rate limit
    // bounds that; this bounds a visitor who has no reason to.
    if (!user) {
      const asked = tx.findRecordsByFilter(
        'messages',
        'visitor = {:visitor} && author = "visitor" && faq = "" && thread.user = ""',
        '',
        GUEST_QUESTIONS,
        0,
        { visitor: visitor },
      );
      left = GUEST_QUESTIONS - asked.length;

      if (text && left <= 0) {
        throw new ForbiddenError('A guest can ask ' + GUEST_QUESTIONS + ' questions. Create an account or sign in to keep asking.');
      }
    }

    // One conversation per product: a customer's across every browser they sign in from,
    // a guest's for as long as the browser keeps its id.
    let thread = null;
    try {
      thread = user
        ? tx.findFirstRecordByFilter('threads', 'user = {:user} && product = {:product}', { user: user.id, product: product.id })
        : tx.findFirstRecordByFilter('threads', 'visitor = {:visitor} && user = "" && product = {:product}', { visitor: visitor, product: product.id });
    } catch (err) {
      // the first question about this product
    }

    if (!thread) {
      thread = new Record(tx.findCollectionByNameOrId('threads'));
      thread.set('product', product.id);
      thread.set('subject', product.getString('title'));
      thread.set('visitor', visitor);
      if (user) thread.set('user', user.id);
    }
    thread.set('last_message', new DateTime());
    tx.save(thread);

    const message = new Record(tx.findCollectionByNameOrId('messages'));
    message.set('thread', thread.id);
    message.set('author', 'visitor');
    message.set('visitor', visitor);
    if (faq) message.set('faq', faq.id);
    message.set('body', faq ? faq.getString('question') : text);
    tx.save(message);

    if (!user && text) left -= 1;
  });

  // Only a guest has questions left; a customer's count is null.
  return e.json(200, { left: left });
});
