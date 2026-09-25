/// <reference path="../pb_data/types.d.ts" />

// Every mail the shop sends is a file in server/mail/, and this turns one into a message: the
// template filled with what the hook hands over, framed by layout.html, with its <title> as the
// subject. The files are read on every send, so an edited template is the one the next mail
// uses, with no restart. The syntax is in server/mail/README.md.
//
// Not a hook itself: a handler takes it in with require(__hooks + '/mailer.js').

const DIR = __hooks + '/../mail/';
const NAME = /^[a-z0-9-]+$/;

const read = (file) => toString($os.readFile(DIR + file));

const escape = (value) => value
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const text = (value) => (value === undefined || value === null ? '' : String(value));

// Notes for whoever edits a template stay out of the mail. Outlook's [if mso] comments are
// instructions rather than notes, and stay.
const strip = (template) => template.replace(/<!--(?!\[if)[\s\S]*?-->/g, '');

// {{> name}}: _name.html in its place, before anything is filled in. Notes go first, so a
// note that mentions a part does not pull it in.
const include = (template, depth) => strip(template).replace(/\{\{>\s*([a-z0-9-]+)\s*\}\}/g, (all, name) => {
  if (depth > 5) throw new Error('mail parts nest too deep, at ' + name);
  return include(read('_' + name + '.html'), depth + 1);
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

// { subject, html } for one mail. Every template may use the shop's name and address as well
// as its own data: {{shopName}} and {{appURL}}, from Settings → Application in the dashboard.
function render(name, data) {
  if (!NAME.test(name)) throw new Error('not a mail: ' + name);

  const meta = $app.settings().meta;
  const scopes = [{ shopName: meta.appName, appURL: meta.appURL }, data || {}];

  const source = include(read(name + '.html'), 0);
  const title = source.match(/<title>([\s\S]*?)<\/title>/i);
  const subject = fill(title ? title[1] : '', scopes, false).replace(/\s+/g, ' ').trim();
  const content = fill(source.replace(/<title>[\s\S]*?<\/title>/i, ''), scopes, true).trim();
  const html = fill(strip(read('layout.html')), scopes.concat([{ subject: subject, content: content }]), true);

  return { subject: subject, html: html };
}

// A mail already filled, { subject, html }, from the shop's own address, as every mail here is.
function deliver(mail, to) {
  const meta = $app.settings().meta;

  $app.newMailClient().send(new MailerMessage({
    from: { address: meta.senderAddress, name: meta.senderName },
    to: to,
    subject: mail.subject,
    html: mail.html,
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
  } catch (err) {
    $app.logger().error('mail template failed, sent PocketBase\'s own instead', 'mail', name, 'error', String(err));
  }
}

// Every mail there is, in the order /admin/mail lists them, with what each one is for and the
// sample data its preview is filled with.
function catalogue() {
  return JSON.parse(read('mails.json'));
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

module.exports = { render, send, deliver, replace, catalogue, preview };
