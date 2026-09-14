/// <reference path="../pb_data/types.d.ts" />

// The chat on a product page, in three collections.
//
// faqs is the list a visitor picks from, and the only part anybody may read: it is edited in
// the dashboard, so changing an answer is not a deploy. threads and messages are closed both
// ways. server/pb_hooks/chat.pb.js is the only way in, and for now the dashboard is the only
// way to read them. A guest's conversation is the shop's to see and not theirs to fetch: the
// id their browser sends names a visitor, it proves nothing about who is asking.
migrate(
  (app) => {
    const products = app.findCollectionByNameOrId('products');
    const users = app.findCollectionByNameOrId('users');

    const faqs = new Collection({
      type: 'base',
      name: 'faqs',

      listRule: 'active = true',
      viewRule: 'active = true',
      createRule: null,
      updateRule: null,
      deleteRule: null,

      fields: [
        { name: 'question', type: 'text', required: true, max: 200 },
        { name: 'answer', type: 'text', required: true, max: 2000 },

        // Lower comes first. Not required, because required on a number means non-zero.
        { name: 'position', type: 'number', onlyInt: true },

        // Off the list without being deleted, so the messages that picked it still point at it.
        { name: 'active', type: 'bool' },

        { name: 'created', type: 'autodate', onCreate: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    app.save(faqs);

    const threads = new Collection({
      type: 'base',
      name: 'threads',

      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,

      fields: [
        // Neither required nor cascading: a product taken out of the catalogue must not take
        // the conversations about it along. The subject keeps its name.
        { name: 'product', type: 'relation', collectionId: products.id, maxSelect: 1, cascadeDelete: false },
        { name: 'subject', type: 'text', required: true },

        // The browser that started it. A guest's thread is found by this and the product,
        // a customer's by the account and the product.
        { name: 'visitor', type: 'text', required: true, pattern: '^[0-9a-f-]{36}$' },
        { name: 'user', type: 'relation', collectionId: users.id, maxSelect: 1, cascadeDelete: false },

        { name: 'last_message', type: 'date' },

        { name: 'created', type: 'autodate', onCreate: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],

      indexes: [
        'CREATE INDEX `idx_threads_visitor` ON `threads` (`visitor`)',
        'CREATE INDEX `idx_threads_user` ON `threads` (`user`)',
      ],
    });
    app.save(threads);

    const messages = new Collection({
      type: 'base',
      name: 'messages',

      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,

      fields: [
        { name: 'thread', type: 'relation', collectionId: threads.id, maxSelect: 1, required: true, cascadeDelete: true },

        // 'visitor' is whoever is on the other side of the shop, signed in or not; the thread
        // says which.
        { name: 'author', type: 'select', required: true, maxSelect: 1, values: ['visitor', 'shop'] },

        // On every message and not only the thread: a customer writes from more than one
        // browser, and this is what shows the same visitor coming back.
        { name: 'visitor', type: 'text', pattern: '^[0-9a-f-]{36}$' },

        { name: 'faq', type: 'relation', collectionId: faqs.id, maxSelect: 1, cascadeDelete: false },

        // What was asked as it read at the time, a picked question included, since its
        // wording can change. The hook keeps a visitor's shorter than this.
        { name: 'body', type: 'text', required: true, max: 2000 },

        { name: 'created', type: 'autodate', onCreate: true },
      ],

      indexes: [
        'CREATE INDEX `idx_messages_thread` ON `messages` (`thread`)',
        'CREATE INDEX `idx_messages_visitor` ON `messages` (`visitor`)',
      ],
    });
    app.save(messages);

    // The answers repeat the shop's rules in words: SHIPPING, FREE_FROM and FREE_UP_TO in
    // server/pb_hooks/orders.pb.js, and the cap of ten. Change one, and change the other here
    // in the dashboard.
    const rows = [
      {
        question: 'How much is shipping?',
        answer: '15 EUR per order. An order of 300 EUR or more ships free, as long as it weighs no more than 20 kg.',
      },
      {
        question: 'How do I pay?',
        answer: 'Cash on delivery: you pay the courier when the parcel arrives. Card payment is not available yet.',
      },
      {
        question: 'Can I order without an account?',
        answer: 'Yes. Checkout asks for your name, email, phone and address, and opens an account for that email so you can find the order later. The confirmation carries a link for choosing a password.',
      },
      {
        question: 'How many can I order?',
        answer: 'Up to 10 of each product in one order, as long as there are that many in stock.',
      },
      {
        question: 'Where is my order?',
        answer: 'Sign in and open your account: every order is listed there with its status, from pending to shipped and delivered.',
      },
    ];

    rows.forEach((row, index) => {
      const record = new Record(faqs);
      record.set('question', row.question);
      record.set('answer', row.answer);
      record.set('position', (index + 1) * 10);
      record.set('active', true);
      app.save(record);
    });
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('messages'));
    app.delete(app.findCollectionByNameOrId('threads'));
    app.delete(app.findCollectionByNameOrId('faqs'));
  },
);
