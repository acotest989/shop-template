/// <reference path="../pb_data/types.d.ts" />

// A question from the chat on a product page: one of the shop's own, picked from the list,
// or one the visitor wrote. The chat collections refuse every write, so this route is the
// only way in. A customer reads their conversations through the collection rules; a guest
// reads nothing back.
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

  // The visitor writes these, and they end up inside markup the shop mails to itself.
  const esc = (value) => String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  let left = null;
  let sent = null;
  let notice = null; // set when this question leaves the shop owing an answer it did not owe before

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
    // The shop hears about a conversation once per question it owes an answer to. A follow-up
    // written before the reply is part of the same question, and waits in the inbox with it.
    if (text && !thread.getBool('waiting')) {
      notice = {
        subject: thread.getString('subject'),
        from: user ? user.getString('name') || user.getString('email') : 'A guest',
        email: user ? user.getString('email') : '',
        text: text,
      };
    }

    // What the inbox lists without opening the conversation. A pick from the list is answered
    // already; only a written question leaves the shop owing a reply.
    thread.set('last_message', new DateTime());
    thread.set('preview', (faq ? faq.getString('question') : text).replace(/\s+/g, ' ').slice(0, 200));
    if (text) thread.set('waiting', true);
    tx.save(thread);

    const message = new Record(tx.findCollectionByNameOrId('messages'));
    message.set('thread', thread.id);
    message.set('author', 'visitor');
    message.set('visitor', visitor);
    if (faq) message.set('faq', faq.id);
    message.set('body', faq ? faq.getString('question') : text);
    tx.save(message);

    if (!user && text) left -= 1;
    if (notice) notice.thread = thread.id;

    // The fields a customer's chat reads, so the question shows without waiting for realtime.
    sent = {
      id: message.id,
      thread: thread.id,
      author: 'visitor',
      body: message.getString('body'),
      faq: message.getString('faq'),
      created: message.getString('created'),
    };
  });

  // After the transaction, and outside it: the question stands whether or not the mail goes,
  // and a mail server that stalls must not cost the visitor what they wrote. To the address
  // the shop sends from, as with orders, so there is nothing else to configure.
  if (notice) {
    try {
      const meta = $app.settings().meta;
      $app.newMailClient().send(new MailerMessage({
        from: { address: meta.senderAddress, name: meta.senderName },
        to: [{ address: meta.senderAddress }],
        subject: 'Question about ' + notice.subject,
        html:
          '<p><strong>' + esc(notice.from) + '</strong>' +
          (notice.email ? ' &lt;' + esc(notice.email) + '&gt;' : '') +
          ' asks about ' + esc(notice.subject) + ':</p>' +
          '<p style="border-left:3px solid #ccc;padding-left:12px">' + esc(notice.text).replace(/\n/g, '<br>') + '</p>' +
          '<p><a href="' + meta.appURL + '/admin/inbox?thread=' + notice.thread + '">Answer in the inbox</a></p>',
      }));
    } catch (err) {
      $app.logger().error('chat mail failed', 'thread', notice.thread, 'error', String(err));
    }
  }

  // Only a guest has questions left; a customer's count is null.
  return e.json(200, { left: left, message: sent });
});

// The customer has the shop's latest reply about a product on screen, so the mail about it is
// not needed: the job in inbox.pb.js mails only replies still unseen after five minutes.
routerAdd('POST', '/api/shop/chat/seen', (e) => {
  const productId = String((e.requestInfo().body || {}).product || '');

  let thread;
  try {
    thread = $app.findFirstRecordByFilter('threads', 'user = {:user} && product = {:product}', { user: e.auth.id, product: productId });
  } catch (err) {
    return e.json(200, { seen: false }); // nothing asked about this product, so nothing to see
  }

  if (thread.getString('reply_unseen_since')) {
    thread.set('reply_unseen_since', '');
    thread.set('reply_mailed', false);
    $app.save(thread);
  }

  return e.json(200, { seen: true });
}, $apis.requireAuth('users'));

// A guest's conversations become the account's once there is an account: after signing in,
// after registering, or on the first page a signed-in browser opens after asking as a guest.
// The browser's id is all that ties them together, which is why a shared computer hands them
// to whoever signs in on it next.
routerAdd('POST', '/api/shop/chat/claim', (e) => {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  const visitor = String((e.requestInfo().body || {}).visitor || '').toLowerCase();
  if (!UUID.test(visitor)) {
    throw new BadRequestError('This browser has no visitor id. Reload the page and try again.');
  }

  const user = e.auth;
  let claimed = 0;

  $app.runInTransaction((tx) => {
    const threads = tx.findRecordsByFilter('threads', 'visitor = {:visitor} && user = ""', '', 0, 0, { visitor: visitor });

    for (const thread of threads) {
      const product = thread.getString('product');

      // The account may already have a conversation about the same product, begun while signed
      // in. One product, one conversation: the guest's messages join it. A thread whose product
      // is gone has nothing to be matched on, and is simply taken over.
      let own = null;
      if (product) {
        try {
          own = tx.findFirstRecordByFilter('threads', 'user = {:user} && product = {:product}', { user: user.id, product: product });
        } catch (err) {
          // none yet, which is the ordinary case
        }
      }

      if (!own) {
        thread.set('user', user.id);
        tx.save(thread);
        claimed++;
        continue;
      }

      for (const message of tx.findRecordsByFilter('messages', 'thread = {:thread}', '', 0, 0, { thread: thread.id })) {
        message.set('thread', own.id);
        tx.save(message);
      }

      // The later of the two says what the inbox shows; dates in this format sort as text. An
      // unanswered question in either leaves the merged one waiting.
      if (thread.getString('last_message') > own.getString('last_message')) {
        own.set('last_message', thread.getString('last_message'));
        own.set('preview', thread.getString('preview'));
      }
      if (thread.getBool('waiting')) own.set('waiting', true);
      tx.save(own);

      tx.delete(thread);
      claimed++;
    }
  });

  return e.json(200, { claimed: claimed });
}, $apis.requireAuth('users'));
