/// <reference path="../pb_data/types.d.ts" />

// The shop's side of the chat: a reply, and closing a conversation that needs none. Both are
// for an account with `admin` ticked, and only the dashboard can tick it. The collections
// refuse writes from a browser, so these routes are the only way a reply gets in.
//
// Everything lives inside each handler, for the reason given in orders.pb.js.
routerAdd('POST', '/api/shop/inbox/reply', (e) => {
  // The messages collection's own limit on a body.
  const MAX_LENGTH = 2000;

  if (!e.auth.getBool('admin')) {
    throw new ForbiddenError('Only the shop can reply here.');
  }

  const body = e.requestInfo().body || {};
  const threadId = String(body.thread || '');
  const text = String(body.body || '').trim();

  if (!text) {
    throw new BadRequestError('Write a reply first.');
  }
  if (text.length > MAX_LENGTH) {
    throw new BadRequestError('A reply can be at most ' + MAX_LENGTH + ' characters.');
  }

  let sent = null;

  $app.runInTransaction((tx) => {
    let thread;
    try {
      thread = tx.findRecordById('threads', threadId);
    } catch (err) {
      throw new NotFoundError('This conversation no longer exists.');
    }

    const message = new Record(tx.findCollectionByNameOrId('messages'));
    message.set('thread', thread.id);
    message.set('author', 'shop');
    message.set('body', text);
    tx.save(message);

    thread.set('last_message', new DateTime());
    thread.set('preview', text.replace(/\s+/g, ' ').slice(0, 200));
    thread.set('waiting', false);

    // A customer is mailed about a reply they have not seen in five minutes, by the job below.
    // The clock starts at the first unseen reply, so replying twice does not push it back.
    // A guest has no address to mail.
    if (thread.getString('user') && !thread.getString('reply_unseen_since')) {
      thread.set('reply_unseen_since', new DateTime());
      thread.set('reply_mailed', false);
    }
    tx.save(thread);

    // The fields the inbox reads, so the reply shows without waiting for realtime.
    sent = {
      id: message.id,
      thread: thread.id,
      author: 'shop',
      body: message.getString('body'),
      faq: '',
      created: message.getString('created'),
    };
  });

  return e.json(200, { message: sent });
}, $apis.requireAuth('users'));

// For a conversation that needs no answer: a thank-you, or a question settled some other way,
// like a phone call. It leaves the list of waiting ones without a reply the customer would see.
routerAdd('POST', '/api/shop/inbox/answered', (e) => {
  if (!e.auth.getBool('admin')) {
    throw new ForbiddenError('Only the shop can close a conversation.');
  }

  const threadId = String((e.requestInfo().body || {}).thread || '');

  let thread;
  try {
    thread = $app.findRecordById('threads', threadId);
  } catch (err) {
    throw new NotFoundError('This conversation no longer exists.');
  }

  thread.set('waiting', false);
  $app.save(thread);

  return e.json(200, { waiting: false });
}, $apis.requireAuth('users'));

// A conversation and every message in it, for good: the messages go with the thread, since
// their relation to it cascades. Realtime tells the inbox, and a customer's open chat, as the
// records go. A guest's tab keeps its own copy until it closes, which is all a guest ever had.
routerAdd('POST', '/api/shop/inbox/delete', (e) => {
  if (!e.auth.getBool('admin')) {
    throw new ForbiddenError('Only the shop can delete a conversation.');
  }

  const threadId = String((e.requestInfo().body || {}).thread || '');

  let thread;
  try {
    thread = $app.findRecordById('threads', threadId);
  } catch (err) {
    throw new NotFoundError('This conversation no longer exists.');
  }

  $app.delete(thread);

  return e.json(200, { deleted: true });
}, $apis.requireAuth('users'));

// Every conversation at once, and every message in them. The page sends the newest moment it
// had on screen, and only what is no newer goes: a question that lands while the shop is
// confirming is not swept away unread with the rest.
routerAdd('POST', '/api/shop/inbox/clear', (e) => {
  if (!e.auth.getBool('admin')) {
    throw new ForbiddenError('Only the shop can clear the inbox.');
  }

  // The page has it as 2026-09-15T13:05:00.123Z; stored dates put a space where the T is.
  const before = String((e.requestInfo().body || {}).before || '').replace('T', ' ');
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(before)) {
    throw new BadRequestError('Reload the inbox and try again.');
  }

  let deleted = 0;

  // All or nothing: an inbox half cleared by a failure would be harder to read than either.
  $app.runInTransaction((tx) => {
    for (const thread of tx.findRecordsByFilter('threads', 'last_message <= {:before}', '', 0, 0, { before: before })) {
      tx.delete(thread);
      deleted++;
    }
  });

  return e.json(200, { deleted: deleted });
}, $apis.requireAuth('users'));

// Every minute, one mail to each customer with a reply they have not seen for five minutes.
// Seen means the chat on the product page showed it, and said so to /api/shop/chat/seen.
cronAdd('chat_reply_mail', '* * * * *', () => {
  const DELAY_MINUTES = 5;

  // Dates are stored as text in this very format, so they compare as text.
  const cutoff = new Date(Date.now() - DELAY_MINUTES * 60 * 1000).toISOString().replace('T', ' ');

  const threads = $app.findRecordsByFilter(
    'threads',
    'reply_unseen_since != "" && reply_unseen_since <= {:cutoff} && reply_mailed = false && user != ""',
    'reply_unseen_since',
    50,
    0,
    { cutoff: cutoff },
  );
  if (!threads.length) return;

  const meta = $app.settings().meta;

  for (const thread of threads) {
    // Marked before the mail goes: a mail server that keeps failing would otherwise mail the
    // same customer every minute. A failure is logged, and the reply still waits on the page.
    thread.set('reply_mailed', true);
    $app.save(thread);

    try {
      const user = $app.findRecordById('users', thread.getString('user'));
      const latest = $app.findRecordsByFilter('messages', 'thread = {:thread} && author = "shop"', '-created', 1, 0, { thread: thread.id });

      // Straight into the conversation, with the chat open. A product that is gone or hidden has
      // no page to open it on, and the shop's front page is the nearest thing; the reply itself
      // is in the mail either way.
      let link = meta.appURL + '/';
      try {
        const product = $app.findRecordById('products', thread.getString('product'));
        if (!product.getBool('hidden')) {
          link = meta.appURL + '/products/' + product.getString('handle') + '?chat';
        }
      } catch (err) {
        // out of the catalogue since the question was asked
      }

      const name = user.getString('name');

      // chat-reply.html in server/mail/.
      require(__hooks + '/mailer.js').send('chat-reply', {
        name: name,
        product: thread.getString('subject'),
        reply: latest.length ? latest[0].getString('body') : '',
        link: link,
      }, [{ address: user.getString('email'), name: name }]);
    } catch (err) {
      $app.logger().error('reply mail failed', 'thread', thread.id, 'error', String(err));
    }
  }
});
