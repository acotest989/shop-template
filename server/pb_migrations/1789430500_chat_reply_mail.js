/// <reference path="../pb_data/types.d.ts" />

// What the mail about a reply needs to remember. A customer who is looking at the chat when
// the shop answers gets no mail; one who is not gets a single mail five minutes on, however
// many replies follow before they come back. See server/pb_hooks/inbox.pb.js.
//
// Hidden: the server's own bookkeeping, which no page reads.
migrate(
  (app) => {
    const threads = app.findCollectionByNameOrId('threads');

    // The first reply the customer has not seen yet, or empty once they have.
    threads.fields.add(new DateField({ name: 'reply_unseen_since', hidden: true }));

    // Whether the mail about those replies went out.
    threads.fields.add(new BoolField({ name: 'reply_mailed', hidden: true }));

    threads.addIndex('idx_threads_reply_unseen_since', false, 'reply_unseen_since', '');
    app.save(threads);
  },
  (app) => {
    const threads = app.findCollectionByNameOrId('threads');
    threads.removeIndex('idx_threads_reply_unseen_since');
    threads.fields.removeByName('reply_unseen_since');
    threads.fields.removeByName('reply_mailed');
    app.save(threads);
  },
);
