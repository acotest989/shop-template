/// <reference path="../pb_data/types.d.ts" />

// What a search engine asks for before it reads a page: which addresses there are, and which it
// may crawl. Both name the shop by Application URL (Settings → Application in the dashboard), so
// on a real domain they are right the moment that is.
//
// Everything lives inside each handler, for the reason given in orders.pb.js.

// The front page and every product for sale, each product with the day it last changed.
routerAdd('GET', '/sitemap.xml', (e) => {
  const appURL = String($app.settings().meta.appURL || '').replace(/\/+$/, '');
  const escape = (value) => String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const products = $app.findRecordsByFilter('products', 'hidden = false', 'handle', 0, 0);

  let urls = '  <url><loc>' + escape(appURL + '/') + '</loc></url>\n';
  for (const product of products) {
    urls += '  <url><loc>' + escape(appURL + '/products/' + product.getString('handle')) + '</loc>'
      + '<lastmod>' + product.getString('updated').slice(0, 10) + '</lastmod></url>\n';
  }

  return e.blob(200, 'application/xml; charset=utf-8',
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '</urlset>\n');
});

// Everything but the catalogue is somebody's own, or a step on the way to buying: nothing a
// search result should open on. PocketBase's API and dashboard are no pages at all.
routerAdd('GET', '/robots.txt', (e) => {
  const appURL = String($app.settings().meta.appURL || '').replace(/\/+$/, '');
  const closed = [
    '/admin', '/account', '/cart', '/checkout',
    '/login', '/register', '/verify/', '/forgot-password', '/reset-password/', '/confirm-email/',
    '/api/', '/_/',
  ];

  return e.blob(200, 'text/plain; charset=utf-8',
    'User-agent: *\n'
    + closed.map((path) => 'Disallow: ' + path).join('\n') + '\n\n'
    + 'Sitemap: ' + appURL + '/sitemap.xml\n');
});
