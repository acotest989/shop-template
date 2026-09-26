/// <reference path="../../pb_data/types.d.ts" />

// The shop's files as the world receives them: how long a browser keeps them, index.html as each
// address should arrive, and what a search engine asks for before it reads a page. The middleware
// and the routes that call these are in pb_hooks/shop.pb.js.

// The shop's files: pb_public beside pb_hooks, where PocketBase serves them from by default, on
// this machine and in the Docker image alike.
const DIR = __hooks + '/../pb_public';

const appURL = () => String($app.settings().meta.appURL || '').replace(/\/+$/, '');

const escape = (value) => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// In front of every request that is not the API's or the dashboard's, which PocketBase answers
// for itself.
//
// The shop's own files carry no version in their names, since nothing builds them. Left to itself
// a browser guesses how long a copy stays good, and a file untouched for weeks can be served from
// its cache for days after a deploy: this week's chat.js beside last month's app.js, and a page
// that breaks without an error. no-cache keeps the copy but asks the server first; a file that
// has not changed costs a 304 and no body.
//
// Then index.html, for every address that is not a file.
function serve(e) {
  const path = e.request.url.path;
  if (path.startsWith('/api/') || path.startsWith('/_/')) return e.next();

  e.response.header().set('Cache-Control', 'no-cache');

  const method = e.request.method;
  if (method !== 'GET' && method !== 'HEAD') return e.next();
  if (path === '/sitemap.xml' || path === '/robots.txt') return e.next(); // their own routes, below

  // A file that is there goes out as it is: a script, a picture, a page's template. Anything else
  // is a route of the shop, /products/lamp or /verify/<token>, and gets index.html, as it would
  // from PocketBase's own fallback.
  if (path !== '/' && path !== '/index.html') {
    try {
      if (!$os.stat(DIR + path).isDir()) return e.next();
    } catch (err) {
      // not a file: a route
    }
  }

  let html;
  try {
    html = toString($os.readFile(DIR + '/index.html'));
  } catch (err) {
    $app.logger().error('index.html unreadable, sent as it is', 'dir', DIR, 'error', String(err));
    return e.next();
  }

  const page = index(html, path);
  return e.html(page.status, page.html);
}

// index.html as this address should arrive. Every page is that one file, the router drawing the
// rest in the browser, so whatever has to be in the page before any script runs is written in
// here, on every load:
//
// - the language: `lang` on <html>, and the dictionaries in the import map, lang/shop and
//   lang/admin, from `language` in `shop_settings`, which the mails and the hooks speak too;
// - the accent colour, data-accent on <html>, from the same record. Both are chosen at
//   /admin/settings;
// - what search engines and link previews read, since they run no script: the title and the
//   description, and Open Graph tags. A product's page gets its own name, description, picture
//   and price, a canonical address, and the product as schema.org data; one that does not exist,
//   or is hidden, is a 404 that asks not to be indexed.
//
// The file itself stays English, and is what goes out whenever this cannot read it.
function index(html, path) {
  const lang = require(__hooks + '/lib/lang.js').open();
  const code = lang.language;

  let accent = '';
  try {
    accent = $app.findFirstRecordByFilter('shop_settings', 'id != ""').getString('accent');
  } catch (err) {
    // no settings record: the file's own
  }
  if (/^[a-z]+$/.test(accent)) {
    html = html.replace(/(<html\b[^>]*\bdata-accent=")[^"]*"/, (all, start) => start + accent + '"');
  }

  // The shop's name is Application name, which the mails sign with too; site.title in
  // pb_hooks/lang/ only stands in for an empty one.
  const site = String($app.settings().meta.appName || '').trim() || lang.t('site.title');
  const url = appURL() + path;

  let status = 200;
  let title = site;
  let description = lang.t('site.description');
  const meta = { 'og:site_name': site, 'og:type': 'website', 'og:url': url };
  let extra = '';

  // A product's own page: the address the shop links to, /products/<handle>.
  const product = path.match(/^\/products\/([^\/]+)\/?$/);
  if (product) {
    let record = null;
    try {
      record = $app.findFirstRecordByFilter('products', 'handle = {:handle} && hidden = false', { handle: product[1] });
    } catch (err) {
      // no such product, or not for sale
    }

    if (!record) {
      // The page still opens and says so; a search engine is told the address leads nowhere.
      status = 404;
      extra += '<meta name="robots" content="noindex">\n';
    } else {
      // A description for a result is a sentence or two: the product's own first ~160 characters,
      // cut at a word.
      const text = record.getString('description').replace(/\s+/g, ' ').trim();
      const short = text.length > 160 ? text.slice(0, 160).replace(/\s+\S*$/, '') + '…' : text;

      let pictures = [];
      try {
        pictures = JSON.parse(record.getString('images') || '[]') || [];
      } catch (err) {
        // malformed: the card's picture alone
      }
      const image = record.getString('image');
      if (!pictures.length && image) pictures = [image];

      const canonical = appURL() + '/products/' + record.getString('handle');
      const price = (record.getInt('price_cents') / 100).toFixed(2);
      const currency = record.getString('currency');
      const brand = record.getString('brand');

      title = record.getString('title') + ' — ' + site;
      if (short) description = short;
      meta['og:type'] = 'product';
      meta['og:url'] = canonical;
      if (pictures.length) meta['og:image'] = pictures[0];
      meta['product:price:amount'] = price;
      meta['product:price:currency'] = currency;

      // The product as Google reads one for a rich result: name, pictures, brand, and an offer
      // with its price and whether it can be bought.
      const data = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: record.getString('title'),
        description: text,
        image: pictures,
        sku: record.id,
        category: record.getString('category'),
        offers: {
          '@type': 'Offer',
          url: canonical,
          price: price,
          priceCurrency: currency,
          availability: record.getInt('stock') > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
        },
      };
      if (brand) data.brand = { '@type': 'Brand', name: brand };

      extra += '<link rel="canonical" href="' + escape(canonical) + '">\n';
      extra += '<script type="application/ld+json">' + JSON.stringify(data).replace(/</g, '\\u003c') + '</script>\n';
    }
  }

  meta['og:title'] = title;
  meta['og:description'] = description;
  meta['twitter:card'] = meta['og:image'] ? 'summary_large_image' : 'summary';

  let tags = '';
  for (const name in meta) {
    const key = name.indexOf('twitter:') === 0 ? 'name' : 'property';
    tags += '<meta ' + key + '="' + name + '" content="' + escape(meta[name]) + '">\n';
  }

  html = html
    .replace(/<html lang="[^"]*"/, '<html lang="' + code + '"')
    .replace(/"\/lang\/[^\/"]+\/(shop|admin)\.js"/g, (all, part) => '"/lang/' + code + '/' + part + '.js"')
    .replace(/<title>[\s\S]*?<\/title>/, () => '<title>' + escape(title) + '</title>')
    .replace(/(<meta name="description" content=")[^"]*"/, (all, start) => start + escape(description) + '"')
    .replace(/<\/head>/, () => tags + extra + '</head>');

  return { status: status, html: html };
}

// GET /sitemap.xml — the front page and every product for sale, each product with the day it
// last changed. Named by Application URL (Settings → Application in the dashboard), so on a real
// domain it is right the moment that is.
function sitemap(e) {
  const products = $app.findRecordsByFilter('products', 'hidden = false', 'handle', 0, 0);

  let urls = '  <url><loc>' + escape(appURL() + '/') + '</loc></url>\n';
  for (const product of products) {
    urls += '  <url><loc>' + escape(appURL() + '/products/' + product.getString('handle')) + '</loc>'
      + '<lastmod>' + product.getString('updated').slice(0, 10) + '</lastmod></url>\n';
  }

  return e.blob(200, 'application/xml; charset=utf-8',
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '</urlset>\n');
}

// GET /robots.txt — everything but the catalogue is somebody's own, or a step on the way to
// buying: nothing a search result should open on. PocketBase's API and dashboard are no pages at
// all.
function robots(e) {
  const closed = [
    '/admin', '/account', '/cart', '/checkout',
    '/login', '/register', '/verify/', '/forgot-password', '/reset-password/', '/confirm-email/',
    '/api/', '/_/',
  ];

  return e.blob(200, 'text/plain; charset=utf-8',
    'User-agent: *\n'
    + closed.map((path) => 'Disallow: ' + path).join('\n') + '\n\n'
    + 'Sitemap: ' + appURL() + '/sitemap.xml\n');
}

module.exports = { serve, sitemap, robots };
