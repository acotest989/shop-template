/// <reference path="../pb_data/types.d.ts" />

// Orders, and the one number the catalogue keeps about them.
//
// The collection is closed: nothing here may be written from a browser. A hook owns
// creation, because price and stock are the two things a client must never decide,
// and both are settled in the same place.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users');

    const orders = new Collection({
      type: 'base',
      name: 'orders',

      // Your own orders, and only while signed in. The first half is not redundant:
      // without it an anonymous request compares an empty id against an empty owner
      // and matches every order whose owner has since been deleted.
      listRule: '@request.auth.id != "" && user = @request.auth.id',
      viewRule: '@request.auth.id != "" && user = @request.auth.id',
      createRule: null,
      updateRule: null,
      deleteRule: null,

      fields: [
        { name: 'reference', type: 'text', required: true },

        // Neither required nor cascading: closing an account must not take its orders
        // with it. The relation empties, and the rule above stops listing them.
        { name: 'user', type: 'relation', collectionId: users.id, maxSelect: 1, cascadeDelete: false },

        // What was typed at checkout, which is not always what the account says. An
        // address belongs to the shipment rather than to the person, and stays as it
        // was even after the profile changes.
        { name: 'name', type: 'text', required: true },
        { name: 'email', type: 'email', required: true },
        { name: 'phone', type: 'text', required: true },
        { name: 'address', type: 'text', required: true },

        // A line is a snapshot, like a cart line: what was bought, at what it cost that
        // day. A relation to a live product would show today's price on last year's order.
        { name: 'lines', type: 'json', required: true, maxSize: 20000 },

        { name: 'currency', type: 'text', required: true },
        { name: 'subtotal', type: 'number', required: true, onlyInt: true },

        // Free in this demo, so it cannot be required — required on a number means non-zero.
        { name: 'shipping', type: 'number', onlyInt: true },

        { name: 'total', type: 'number', required: true, onlyInt: true },

        // Money and delivery are two axes, and cash on delivery is what separates them:
        // a card order is paid and unshipped, a COD order ships before anyone is paid.
        { name: 'payment', type: 'select', required: true, maxSelect: 1, values: ['card', 'cod'] },

        // Not required for the same reason as shipping: required on a bool means true,
        // and an unpaid COD order is exactly the state worth recording.
        { name: 'paid', type: 'bool' },

        { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['pending', 'shipped', 'cancelled'] },

        { name: 'created', type: 'autodate', onCreate: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],

      indexes: [
        'CREATE UNIQUE INDEX `idx_orders_reference` ON `orders` (`reference`)',
        'CREATE INDEX `idx_orders_user` ON `orders` (`user`)',
      ],
    });

    app.save(orders);

    // Counted, not derived: the lines are json, so nothing can add them up in a query.
    // The hook that lowers stock raises this in the same breath.
    const products = app.findCollectionByNameOrId('products');
    products.fields.add(new NumberField({ name: 'sold', onlyInt: true }));

    return app.save(products);
  },
  (app) => {
    const products = app.findCollectionByNameOrId('products');
    products.fields.removeByName('sold');
    app.save(products);

    return app.delete(app.findCollectionByNameOrId('orders'));
  },
);
