/// <reference path="../pb_data/types.d.ts" />

// A signed-in customer reads their own conversations: the history on the product page, and
// the shop's replies as they land, since realtime delivers only what these rules let through.
// Writing stays closed, and a guest still reads nothing: a thread without an account matches
// no rule here.
//
// The first half of each rule is not redundant, for the reason given in the orders migration.
migrate(
  (app) => {
    const threads = app.findCollectionByNameOrId('threads');
    threads.listRule = '@request.auth.id != "" && user = @request.auth.id';
    threads.viewRule = '@request.auth.id != "" && user = @request.auth.id';
    app.save(threads);

    const messages = app.findCollectionByNameOrId('messages');
    messages.listRule = '@request.auth.id != "" && thread.user = @request.auth.id';
    messages.viewRule = '@request.auth.id != "" && thread.user = @request.auth.id';
    app.save(messages);
  },
  (app) => {
    const threads = app.findCollectionByNameOrId('threads');
    threads.listRule = null;
    threads.viewRule = null;
    app.save(threads);

    const messages = app.findCollectionByNameOrId('messages');
    messages.listRule = null;
    messages.viewRule = null;
    app.save(messages);
  },
);
