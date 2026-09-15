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
