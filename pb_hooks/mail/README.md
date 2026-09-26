# Mail

Every mail the shop sends is a file here, PocketBase's own account mails included. `/admin/mail` shows each one filled with sample data, at desktop and phone width and as plain text, and **Reload** there shows a template as it stands after an edit. **Send test** mails the one on show, filled the same way, to your own address, with `[Test]` in front of its subject: how a mail looks in Gmail or on a phone is something a preview can only guess at. The files are read on every send, so an edit needs no restart.

| File | What it is |
|---|---|
| `layout.html` | The frame around every mail, in every language: the shop's name above, its address below, the mail as `{{{content}}}`, and the hidden `{{preheader}}`. |
| `en/`, `sr-Latn/` | The mails in each language, the same files in every folder. |

In each language's folder:

| File | What it is |
|---|---|
| `mails.json` | Every mail, in the order `/admin/mail` lists them: what it is, who gets it, when, and the sample its preview is filled with. |
| `_order-summary.html` | A part, not a mail: the lines, shipping and total both order mails show. |
| `_link-fallback.html` | A part: under a button, its `{{link}}` spelled out, for a mail program that draws no button. |
| everything else | One mail each, named as in `mails.json`. |

## Languages

Every language is a folder, and a shop sends from the one chosen at `/admin/settings`, `language` in `shop_settings` (see `pb_public/lang/README.md`). A file a language's folder lacks is taken from `en/`, so a half-translated folder still sends every mail. `layout.html` has no words of its own and serves them all: `{{language}}` puts the language on its `<html>`.

The notes on what each mail is for are in the English files; the translations carry none, so they stay short.

## Writing one

The `<title>` is the subject. The rest is the body, and it goes into `layout.html`.

```html
<title>Order {{reference}}</title>
<p>Thank you, {{name}}.</p>
{{> order-summary}}
{{#paid}}<p>Nothing is owed on delivery.</p>{{/paid}}
{{^paid}}<p>Please have {{total}} ready for the courier.</p>{{/paid}}
{{#lines}}<p>{{title}} × {{qty}}</p>{{/lines}}
```

| | |
|---|---|
| `{{name}}` | a value, escaped, its line breaks kept |
| `{{{content}}}` | a value as it is, markup and all; only the layout needs one |
| `{{#name}}…{{/name}}` | shown when the value is there: once for a word or a `true`, once per item for a list, whose fields are then names of their own |
| `{{^name}}…{{/name}}` | shown when it is not |
| `{{> name}}` | the part `_name.html`, in its place |

`{{shopName}}`, `{{appURL}}` and `{{language}}` work in every mail. They are **Settings → Application** in the dashboard: the shop's name, which the pages show as well and PocketBase ships as Acme, and the address every link starts with. The rest are whatever the hook sending the mail hands over, and the sample in `mails.json` has every one of them. A name that is not there comes out empty.

`<!-- comments -->` are notes for whoever edits the file, and are taken out before anything is sent.

It is mail, not a web page: tables for layout, styles inline on each element, no scripts. Plenty of mail programs read nothing else.

Nothing else needs writing by hand. `pb_hooks/lib/mailer.js` makes two things from every template as it fills it:

- **a plain-text part**, sent beside the HTML: what a program that shows no HTML shows, and what spam filters expect to find. A link becomes its words and its address, a table row a line. Anything marked `data-html-only` is left out of it — the address under a button, which the button's own line already carries.
- **the preheader**, the line an inbox shows under the subject: the start of the mail's own text, hidden in the mail itself. Without it, the inbox would show the shop's name from the header.

A mail with a link that runs out says how long it is good for, in `{{validFor}}`: PocketBase's token settings on the users collection (**Options** in the dashboard), written as the shop's language writes time. The order confirmation's password link is a reset token, which this shop keeps good for a day: `pb_migrations/1790295000_password_link_day.js`.

## Who sends what

| Mail | Sent by |
|---|---|
| `order-confirmation`, `shop-new-order` | `pb_hooks/lib/orders.js`, as an order is placed |
| `shop-new-question` | `pb_hooks/lib/chat.js`, as a question starts waiting |
| `chat-reply` | `pb_hooks/lib/inbox.js`, a job that runs every minute |
| `verify-email`, `reset-password`, `confirm-email-change`, `login-alert` | PocketBase itself; `pb_hooks/lib/mail.js` swaps its text for these |

The mail templates on the users collection in the dashboard no longer decide anything: the hooks replace what PocketBase makes from them. Should one of these files fail to fill, PocketBase's own message goes out in its place rather than none at all.

A new mail is a file in `en/`, an entry in its `mails.json`, and code that calls `require(__hooks + '/lib/mailer.js').send(name, data, to)` — and the same file and entry in every other language's folder. Money the hook hands over is already written in the shop's language, by `lang.money()` in `pb_hooks/lib/lang.js`.
