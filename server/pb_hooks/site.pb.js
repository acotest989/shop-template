/// <reference path="../pb_data/types.d.ts" />

// index.html in the shop's language and colour. Every page of the shop is that one file, the
// router drawing the rest in the browser, and the file names the language in two places: `lang`
// on <html>, and the dictionaries in the import map, lang/shop and lang/admin. Rather than have
// anybody keep those in step with `language` in `shop_settings`, which the mails and the hooks
// speak, this hands out index.html with both rewritten to it, and the title and description with
// them: those are read by search engines and link previews, which run no script. The accent,
// data-accent on <html>, comes from the same record. Both are chosen at /admin/settings.
//
// The file itself stays English, and is what goes out whenever this cannot read it.
routerUse((e) => {
  const method = e.request.method;
  const path = e.request.url.path;

  if (method !== 'GET' && method !== 'HEAD') return e.next();
  if (path.startsWith('/api/') || path.startsWith('/_/')) return e.next();

  // Where the shop's files are: --publicDir, as given to `serve`, or else pb_public beside the
  // binary, which is PocketBase's own default and where the Dockerfile puts them.
  const args = $os.args;
  let dir = '';
  for (let i = 1; i < args.length; i++) {
    if (args[i].indexOf('--publicDir=') === 0) dir = args[i].slice('--publicDir='.length);
    else if (args[i] === '--publicDir' && i + 1 < args.length) dir = args[i + 1];
  }
  if (!dir) {
    const binary = String(args[0]);
    const cut = Math.max(binary.lastIndexOf('/'), binary.lastIndexOf('\\'));
    dir = (cut === -1 ? '.' : binary.slice(0, cut)) + '/pb_public';
  }

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

  html = html
    .replace(/<html lang="[^"]*"/, '<html lang="' + code + '"')
    .replace(/"\/lang\/[^\/"]+\/(shop|admin)\.js"/g, (all, part) => '"/lang/' + code + '/' + part + '.js"')
    .replace(/<title>[\s\S]*?<\/title>/, () => '<title>' + attribute(lang.t('site.title')) + '</title>')
    .replace(/(<meta name="description" content=")[^"]*"/, (all, start) => start + attribute(lang.t('site.description')) + '"');

  return e.html(200, html);
});
