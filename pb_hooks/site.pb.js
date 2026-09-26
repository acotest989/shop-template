/// <reference path="../pb_data/types.d.ts" />

// index.html as each address of the shop should arrive. Every page is that one file, the router
// drawing the rest in the browser, so whatever has to be in the page before any script runs is
// written in here, on every load:
//
// - the language: `lang` on <html>, and the dictionaries in the import map, lang/shop and
//   lang/admin, from `language` in `shop_settings`, which the mails and the hooks speak too;
// - the accent colour, data-accent on <html>, from the same record. Both are chosen at
//   /admin/settings;
// - what search engines and link previews read, since they run no script: the title and the
//   description, and Open Graph tags. A product's page gets its own name, description, picture
//   and price, a canonical address, and the product as schema.org data; one that does not exist,
//   or is hidden, is a 404 that asks not to be indexed. The sitemap and robots.txt are seo.pb.js.
//
// The file itself stays English, and is what goes out whenever this cannot read it.
routerUse((e) => {
  const method = e.request.method;
  const path = e.request.url.path;

  if (method !== 'GET' && method !== 'HEAD') return e.next();
  if (path.startsWith('/api/') || path.startsWith('/_/')) return e.next();
  if (path === '/sitemap.xml' || path === '/robots.txt') return e.next(); // seo.pb.js

  // The shop's files: pb_public beside pb_hooks, where PocketBase serves them from by default,
  // on this machine and in the Docker image alike.
  const dir = __hooks + '/../pb_public';

  // A file that is there goes out as it is: a script, a picture, a page's template. Anything else
  // is a route of the shop, /products/lamp or /verify/<token>, and gets index.html, as it would
  // from PocketBase's own fallback.
  if (path !== '/' && path !== '/index.html') {
    try {
      if (!$os.stat(dir + path).isDir()) return e.next();
    } catch (err) {
      // not a file: a route
    }
  }

  let html;
  try {
    html = toString($os.readFile(dir + '/index.html'));
  } catch (err) {
    $app.logger().error('index.html unreadable, sent as it is', 'dir', dir, 'error', String(err));
    return e.next();
  }

  const lang = require(__hooks + '/lang.js').open();
  const code = lang.language;
  const attribute = (value) => String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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
  const appURL = String($app.settings().meta.appURL || '').replace(/\/+$/, '');
  const url = appURL + path;

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

      const canonical = appURL + '/products/' + record.getString('handle');
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

      extra += '<link rel="canonical" href="' + attribute(canonical) + '">\n';
      extra += '<script type="application/ld+json">' + JSON.stringify(data).replace(/</g, '\\u003c') + '</script>\n';
    }
  }

  meta['og:title'] = title;
  meta['og:description'] = description;
  meta['twitter:card'] = meta['og:image'] ? 'summary_large_image' : 'summary';

  let tags = '';
  for (const name in meta) {
    const key = name.indexOf('twitter:') === 0 ? 'name' : 'property';
    tags += '<meta ' + key + '="' + name + '" content="' + attribute(meta[name]) + '">\n';
  }

  html = html
    .replace(/<html lang="[^"]*"/, '<html lang="' + code + '"')
    .replace(/"\/lang\/[^\/"]+\/(shop|admin)\.js"/g, (all, part) => '"/lang/' + code + '/' + part + '.js"')
    .replace(/<title>[\s\S]*?<\/title>/, () => '<title>' + attribute(title) + '</title>')
    .replace(/(<meta name="description" content=")[^"]*"/, (all, start) => start + attribute(description) + '"')
    .replace(/<\/head>/, () => tags + extra + '</head>');

  return e.html(status, html);
});
