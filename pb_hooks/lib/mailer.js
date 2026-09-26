/// <reference path="../../pb_data/types.d.ts" />

// Every mail the shop sends is a file in pb_hooks/mail/, and this turns one into a message: the
// template filled with what the hook hands over, framed by layout.html, with its <title> as the
// subject. The files are read on every send, so an edited template is the one the next mail
// uses, with no restart. The syntax is in pb_hooks/mail/README.md.
//
// A mail is in the shop's language, `language` in `shop_settings`: every language is a folder,
// pb_hooks/mail/en/ and pb_hooks/mail/sr-Latn/, and a file a language's folder lacks is taken
// from en/. layout.html has no words and serves them all.
//
// Code that sends a mail takes this in with require(__hooks + '/lib/mailer.js').

const DIR = __hooks + '/mail/';
const NAME = /^[a-z0-9-]+$/;

// A file's path under pb_hooks/mail/: the language's own, or else the English one, which every
// mail has.
const locate = (file, lang) => {
  if (lang && lang !== 'en') {
    try {
      $os.readFile(DIR + lang + '/' + file);
      return lang + '/' + file;
    } catch (err) {
      // not translated
    }
  }
  return 'en/' + file;
};

const read = (file, lang) => toString($os.readFile(DIR + locate(file, lang)));

const escape = (value) => value
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const text = (value) => (value === undefined || value === null ? '' : String(value));

// Notes for whoever edits a template stay out of the mail. Outlook's [if mso] comments are
// instructions rather than notes, and stay.
const strip = (template) => template.replace(/<!--(?!\[if)[\s\S]*?-->/g, '');

// {{> name}}: _name.html in its place, before anything is filled in. Notes go first, so a
// note that mentions a part does not pull it in.
const include = (template, depth, lang) => strip(template).replace(/\{\{>\s*([a-z0-9-]+)\s*\}\}/g, (all, name) => {
  if (depth > 5) throw new Error('mail parts nest too deep, at ' + name);
  return include(read('_' + name + '.html', lang), depth + 1, lang);
});

// A template as a tree, parsed once, so a value filled in is never read as a template itself:
// a customer who types {{name}} into the chat gets exactly that back.
const parse = (template) => {
  const tag = /\{\{\{\s*(\w+)\s*\}\}\}|\{\{\s*([#^\/]?)\s*(\w+)\s*\}\}/g;
  const root = { children: [] };
  const open = [root];
  let last = 0;
  let match;

  while ((match = tag.exec(template)) !== null) {
    const node = open[open.length - 1];
    if (match.index > last) node.children.push({ type: 'text', value: template.slice(last, match.index) });
    last = tag.lastIndex;

    if (match[1]) {
      node.children.push({ type: 'raw', key: match[1] });
    } else if (match[2] === '#' || match[2] === '^') {
      const section = { type: 'section', key: match[3], inverted: match[2] === '^', children: [] };
      node.children.push(section);
      open.push(section);
    } else if (match[2] === '/') {
      if (open.length < 2 || node.key !== match[3]) throw new Error('{{/' + match[3] + '}} closes nothing');
      open.pop();
    } else {
      node.children.push({ type: 'value', key: match[3] });
    }
  }

  if (open.length > 1) throw new Error('{{#' + open[open.length - 1].key + '}} is never closed');
  if (last < template.length) root.children.push({ type: 'text', value: template.slice(last) });
  return root.children;
};

// A name from the innermost section outwards: inside {{#lines}}, a line's own fields first,
// then everything the mail was given.
const lookup = (key, scopes) => {
  for (let i = scopes.length - 1; i >= 0; i--) {
    const scope = scopes[i];
    if (scope !== null && typeof scope === 'object' && Object.prototype.hasOwnProperty.call(scope, key)) {
      return scope[key];
    }
  }
  return undefined;
};

// In a mail's body a value is escaped and keeps its line breaks; in the subject it is plain text.
const fillNodes = (nodes, scopes, html) => nodes.map((node) => {
  if (node.type === 'text') return node.value;
  if (node.type === 'raw') return text(lookup(node.key, scopes));
  if (node.type === 'value') {
    const value = text(lookup(node.key, scopes));
    return html ? escape(value).replace(/\r?\n/g, '<br>') : value;
  }

  const value = lookup(node.key, scopes);
  const list = Array.isArray(value);
  const on = list ? value.length > 0 : Boolean(value);

  if (node.inverted) return on ? '' : fillNodes(node.children, scopes, html);
  if (!on) return '';
  if (list) return value.map((item) => fillNodes(node.children, scopes.concat([item]), html)).join('');
  return fillNodes(node.children, scopes.concat([value]), html);
}).join('');

const fill = (template, scopes, html) => fillNodes(parse(template), scopes, html);

// A filled mail's body as plain text, for the part of the message that is not HTML: a mail
// program that reads no HTML shows it, and spam filters trust a mail that has both more than one
// with HTML alone. A link keeps its address after its words, a table row becomes a line, and
// what is marked data-html-only, the address spelled out under a button, is left out, since the
// button's own line already carries it.
const plain = (html) => html
  .replace(/\r?\n/g, ' ') // a line break in the source is only a space in a mail too
  .replace(/<([a-z]+)\b[^>]*\bdata-html-only\b[^>]*>[\s\S]*?<\/\1>/gi, '')
  .replace(/<a\b[^>]*\bhref="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (all, href, words) => {
    const said = words.replace(/<[^>]+>/g, '').trim();
    return said && said !== href ? said + ': ' + href : href;
  })
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/tr>/gi, '\n')
  .replace(/<\/(p|table|div|h\d)>/gi, '\n\n')
  .replace(/<\/td>/gi, '   ')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&times;/g, '×').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, '\'').replace(/&amp;/g, '&')
  .split('\n').map((line) => line.replace(/\s+/g, ' ').trim()).join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

// { subject, html, text, file } for one mail. Every template may use the shop's name and address
// as well as its own data: {{shopName}} and {{appURL}}, from Settings → Application in the
// dashboard, and {{language}}, which the layout puts on <html>. The layout also gets
// {{preheader}}: the start of the mail, which an inbox shows under the subject, where it would
// otherwise show the shop's name in the header.
function render(name, data) {
  if (!NAME.test(name)) throw new Error('not a mail: ' + name);

  const lang = require(__hooks + '/lib/lang.js').language();
  const meta = $app.settings().meta;
  const scopes = [{ shopName: meta.appName, appURL: meta.appURL, language: lang }, data || {}];

  const source = include(read(name + '.html', lang), 0, lang);
  const title = source.match(/<title>([\s\S]*?)<\/title>/i);
  const subject = fill(title ? title[1] : '', scopes, false).replace(/\s+/g, ' ').trim();
  const content = fill(source.replace(/<title>[\s\S]*?<\/title>/i, ''), scopes, true).trim();
  const body = plain(content);
  const preheader = body.replace(/:?\s*https?:\/\/\S+/g, '').replace(/\s+/g, ' ').slice(0, 140);
  const html = fill(strip(toString($os.readFile(DIR + 'layout.html'))), scopes.concat([{ subject: subject, content: content, preheader: preheader }]), true);
  const text = meta.appName + '\n\n' + body + '\n\n-- \n' + meta.appName + ' · ' + meta.appURL;

  return { subject: subject, html: html, text: text, file: 'pb_hooks/mail/' + locate(name + '.html', lang) };
}

// A mail already filled, { subject, html, text }, from the shop's own address, as every mail
// here is.
function deliver(mail, to) {
  const meta = $app.settings().meta;

  $app.newMailClient().send(new MailerMessage({
    from: { address: meta.senderAddress, name: meta.senderName },
    to: to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text || '',
  }));
}

function send(name, data, to) {
  deliver(render(name, data), to);
}

// For PocketBase's own account mails: the message it made from the users collection's
// templates, with ours in its place. Anything wrong on this side leaves its message as it was,
// since a plain mail beats none.
function replace(e, name, data) {
  try {
    const mail = render(name, data);
    e.message.subject = mail.subject;
    e.message.html = mail.html;
    e.message.text = mail.text;
  } catch (err) {
    $app.logger().error('mail template failed, sent PocketBase\'s own instead', 'mail', name, 'error', String(err));
  }
}

// How long the link in one of PocketBase's account mails stays good, in the shop's language: the
// users collection's token setting, 'verificationToken', 'passwordResetToken' or
// 'emailChangeToken', changed in the dashboard under the collection's options. Empty when it
// cannot be read, and the mail then says nothing about it.
function validFor(record, token) {
  try {
    return require(__hooks + '/lib/lang.js').open().duration(record.collection()[token].duration);
  } catch (err) {
    return '';
  }
}

// Every mail there is, in the order /admin/mail lists them, with what each one is for and the
// sample data its preview is filled with, in the shop's language.
function catalogue() {
  return JSON.parse(read('mails.json', require(__hooks + '/lib/lang.js').language()));
}

// One mail filled with its sample, or null for a name mails.json does not have. A sample link
// is written from the shop's root, /verify/…, and takes the shop's real address here.
function preview(name) {
  const mails = catalogue();
  if (!NAME.test(name) || !Object.prototype.hasOwnProperty.call(mails, name)) return null;

  const appURL = $app.settings().meta.appURL;
  const sample = mails[name].sample || {};
  const data = {};
  for (const key in sample) {
    const value = sample[key];
    data[key] = typeof value === 'string' && value.charAt(0) === '/' ? appURL + value : value;
  }

  return render(name, data);
}

module.exports = { render, send, deliver, replace, validFor, catalogue, preview };
