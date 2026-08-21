/// <reference path="../pb_data/types.d.ts" />

// The catalogue moves off dummyjson and into this database. Written by hand rather than
// recorded from the dashboard, because the rules below are the point of the file and are
// easier to read as a sentence than as a diff.
//
// Cent amounts carry the unit in their name. In the app `money()` turns them into a price
// and every module already speaks cents; here the reader is a person looking at a bare
// column, and `price` alone invites somebody to type 19.99 into it.
migrate(
  (app) => {
    const products = new Collection({
      type: 'base',
      name: 'products',

      // Anyone may read the catalogue, nobody may write it. Price stops being the client's
      // word right here, before any hook exists to enforce it.
      listRule: '',
      viewRule: '',
      createRule: null,
      updateRule: null,
      deleteRule: null,

      fields: [
        { name: 'handle', type: 'text', required: true },
        { name: 'title', type: 'text', required: true },
        { name: 'vendor', type: 'text' },

        // Required where vendor is not: a product without a brand is ordinary, a product
        // belonging to no category is a hole in the catalogue.
        { name: 'category', type: 'text', required: true },

        { name: 'price_cents', type: 'number', required: true, onlyInt: true },

        // The struck-through reference price. Empty when nothing is reduced, and never a
        // claim that the item once sold for it.
        { name: 'regular_price_cents', type: 'number', onlyInt: true },

        { name: 'currency', type: 'text', required: true },

        // Not required on purpose: `required` on a number means non-zero here, and nothing
        // left in stock is exactly the state worth recording.
        { name: 'stock', type: 'number', onlyInt: true },

        { name: 'rating', type: 'number' },
        { name: 'tags', type: 'json', maxSize: 2000 },
        { name: 'image', type: 'text' },

        { name: 'created', type: 'autodate', onCreate: true },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],

      // Uniqueness is an index rather than a field flag. Without it two products could share
      // a handle, and /products/:handle would answer with whichever came back first.
      indexes: [
        'CREATE UNIQUE INDEX `idx_products_handle` ON `products` (`handle`)',
        'CREATE INDEX `idx_products_category` ON `products` (`category`)',
      ],
    });

    return app.save(products);
  },
  (app) => app.delete(app.findCollectionByNameOrId('products')),
);
