/// <reference path="../pb_data/types.d.ts" />

// The catalogue in the admin area.
//
// `hidden` takes a product out of the shop without taking it out of the database: orders and
// conversations name it, and cancelling or returning an order puts its goods back on it. Not
// required, since required on a bool means true, and a product nobody ticked is on sale.
//
// Everyone reads what is on sale; an admin reads the rest as well, to edit it and to open its
// page before it goes back on sale. Writing stays closed: server/pb_hooks/products.pb.js.
migrate(
  (app) => {
    const products = app.findCollectionByNameOrId('products');

    products.fields.add(new BoolField({ name: 'hidden' }));

    // Room for a gallery of a dozen addresses from any image host, some of which are long.
    products.fields.getByName('images').maxSize = 10000;

    products.listRule = 'hidden = false || @request.auth.admin = true';
    products.viewRule = 'hidden = false || @request.auth.admin = true';

    app.save(products);
  },
  (app) => {
    const products = app.findCollectionByNameOrId('products');

    products.fields.removeByName('hidden');
    products.fields.getByName('images').maxSize = 2000;
    products.listRule = '';
    products.viewRule = '';

    app.save(products);
  },
);
