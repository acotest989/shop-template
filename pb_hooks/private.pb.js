/// <reference path="../pb_data/types.d.ts" />

// `serve --publicDir=..` hands out the whole repository, and the repository holds the
// database: server/pb_data/data.db, with every password hash and the keys sign-ins are signed
// with, the Telegram token and every order. This keeps server/ and anything named with a
// leading dot, .git included, out of what is served, so running the shop the way the README
// says gives none of it away, on a laptop or on a server somebody set up the same way. The
// Dockerfile copies the frontend alone and never had the problem; this is for everywhere else.
routerUse((e) => {
  const path = e.request.url.path;
  if (path.startsWith('/api/') || path.startsWith('/_/')) return e.next();

  const segments = path.split('/');

  // Windows ignores case and a trailing dot or space in a name, so /SERVER./ opens server/
  // there. Compared the way the disk would see it.
  const top = (segments[1] || '').toLowerCase().replace(/[. ]+$/, '');

  // .well-known is the one dot folder meant to be public: certificates, security.txt, app links.
  const dotted = segments.some((segment) => segment.startsWith('.') && segment !== '.well-known');

  if (top === 'server' || dotted) {
    throw new NotFoundError();
  }

  return e.next();
});
