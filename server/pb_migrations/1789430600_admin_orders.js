/// <reference path="../pb_data/types.d.ts" />

// Orders in the admin area: an admin reads every order, as they read every conversation.
// Changing one still goes through a route, in server/pb_hooks/orders.pb.js, since a status
// moves stock and the collection refuses every write.
//
// A customer's own list no longer rests on the rule alone, now that the rule lets an admin see
// everything: services/orders.js asks for the signed-in account's orders by name.
migrate(
  (app) => {
    const orders = app.findCollectionByNameOrId('orders');
    orders.listRule = '@request.auth.id != "" && (user = @request.auth.id || @request.auth.admin = true)';
    orders.viewRule = '@request.auth.id != "" && (user = @request.auth.id || @request.auth.admin = true)';

    // What the admin lists filter and sort on.
    orders.addIndex('idx_orders_status', false, 'status', '');
    orders.addIndex('idx_orders_created', false, 'created', '');
    app.save(orders);
  },
  (app) => {
    const orders = app.findCollectionByNameOrId('orders');
    orders.removeIndex('idx_orders_status');
    orders.removeIndex('idx_orders_created');
    orders.listRule = '@request.auth.id != "" && user = @request.auth.id';
    orders.viewRule = '@request.auth.id != "" && user = @request.auth.id';
    app.save(orders);
  },
);
