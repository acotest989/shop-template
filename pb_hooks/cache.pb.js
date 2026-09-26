/// <reference path="../pb_data/types.d.ts" />

// The shop's own files carry no version in their names, since nothing builds them. Left to
// itself a browser guesses how long a copy stays good, and a file untouched for weeks can be
// served from its cache for days after a deploy: this week's chat.js beside last month's
// app.js, and a page that breaks without an error. no-cache keeps the copy but asks the
// server first; a file that has not changed costs a 304 and no body.
//
// The API and the dashboard are left to PocketBase, which answers for their caching itself.
routerUse((e) => {
  const path = e.request.url.path;

  if (!path.startsWith('/api/') && !path.startsWith('/_/')) {
    e.response.header().set('Cache-Control', 'no-cache');
  }

  return e.next();
});
