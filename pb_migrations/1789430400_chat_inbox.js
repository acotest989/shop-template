/// <reference path="../pb_data/types.d.ts" />

// The shop's inbox, in collection terms.
//
// `admin` on users marks an account that answers the chat. Only the dashboard can tick it:
// the rules below refuse the field in a signup or a profile update, so nobody grants it to
// themselves. An admin reads every conversation, and the accounts behind them, since the
// inbox has to say who is asking. Replying goes through server/pb_hooks/inbox.pb.js.
//
// Threads gain what an inbox lists without opening anything: the last thing said, and
// whether the conversation is waiting on the shop.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');
    users.fields.add(new BoolField({ name: 'admin' }));
    users.listRule = 'id = @request.auth.id || @request.auth.admin = true';
    users.viewRule = 'id = @request.auth.id || @request.auth.admin = true';
    users.createRule = '@request.body.admin:isset = false';
    users.updateRule = 'id = @request.auth.id && @request.body.admin:isset = false';
    app.save(users);

    const threads = app.findCollectionByNameOrId('threads');

    // A written question sets it and a reply clears it. A pick from the list is answered
    // already, so it never does.
    threads.fields.add(new BoolField({ name: 'waiting' }));
    threads.fields.add(new TextField({ name: 'preview', max: 200 }));

    threads.listRule = '@request.auth.id != "" && (user = @request.auth.id || @request.auth.admin = true)';
    threads.viewRule = '@request.auth.id != "" && (user = @request.auth.id || @request.auth.admin = true)';
    threads.addIndex('idx_threads_last_message', false, 'last_message', '');
    app.save(threads);

    const messages = app.findCollectionByNameOrId('messages');
    messages.listRule = '@request.auth.id != "" && (thread.user = @request.auth.id || @request.auth.admin = true)';
    messages.viewRule = '@request.auth.id != "" && (thread.user = @request.auth.id || @request.auth.admin = true)';
    app.save(messages);

    // The conversations so far, worked out from their messages: the last one says what shows,
    // the last written one whether the shop still owes an answer.
    for (const thread of app.findAllRecords('threads')) {
      const last = app.findRecordsByFilter('messages', 'thread = {:thread}', '-created', 1, 0, { thread: thread.id });
      const written = app.findRecordsByFilter('messages', 'thread = {:thread} && faq = ""', '-created', 1, 0, { thread: thread.id });

      thread.set('preview', last.length ? last[0].getString('body').replace(/\s+/g, ' ').slice(0, 200) : '');
      thread.set('waiting', written.length > 0 && written[0].getString('author') === 'visitor');
      app.save(thread);
    }
  },
  (app) => {
    const messages = app.findCollectionByNameOrId('messages');
    messages.listRule = '@request.auth.id != "" && thread.user = @request.auth.id';
    messages.viewRule = '@request.auth.id != "" && thread.user = @request.auth.id';
    app.save(messages);

    const threads = app.findCollectionByNameOrId('threads');
    threads.removeIndex('idx_threads_last_message');
    threads.fields.removeByName('waiting');
    threads.fields.removeByName('preview');
    threads.listRule = '@request.auth.id != "" && user = @request.auth.id';
    threads.viewRule = '@request.auth.id != "" && user = @request.auth.id';
    app.save(threads);

    const users = app.findCollectionByNameOrId('users');
    users.fields.removeByName('admin');
    users.listRule = 'id = @request.auth.id';
    users.viewRule = 'id = @request.auth.id';
    users.createRule = '';
    users.updateRule = 'id = @request.auth.id';
    app.save(users);
  },
);
