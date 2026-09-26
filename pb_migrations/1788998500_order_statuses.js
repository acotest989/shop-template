/// <reference path="../pb_data/types.d.ts" />

// Two more places an order can end up, both set by hand in the dashboard as the courier
// reports them: delivered, and returned, when a cash-on-delivery parcel is refused at
// the door. A returned order puts its goods back the way a cancelled one does; the hook
// in orders.pb.js does that part.
migrate(
  (app) => {
    const orders = app.findCollectionByNameOrId('orders');
    orders.fields.getByName('status').values = ['pending', 'shipped', 'delivered', 'returned', 'cancelled'];
    app.save(orders);
  },
  (app) => {
    // Every order has to keep a status the field still knows, so the two new ones fold
    // into their nearest old neighbours first. Plain SQL, so no hook sees it: a returned
    // order's goods are already back on the shelf, and the older hook would put them
    // back a second time.
    app.db().newQuery("UPDATE orders SET status = 'shipped' WHERE status = 'delivered'").execute();
    app.db().newQuery("UPDATE orders SET status = 'cancelled' WHERE status = 'returned'").execute();

    const orders = app.findCollectionByNameOrId('orders');
    orders.fields.getByName('status').values = ['pending', 'shipped', 'cancelled'];
    app.save(orders);
  },
);
