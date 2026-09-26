# Mail

Every mail the shop sends is a file here, PocketBase's own account mails included. `/admin/mail` shows each one filled with sample data, at desktop and phone width, and **Reload** there shows a template as it stands after an edit. **Send test** mails the one on show, filled the same way, to your own address, with `[Test]` in front of its subject: how a mail looks in Gmail or on a phone is something a preview can only guess at. The files are read on every send, so an edit needs no restart.

| File | What it is |
|---|---|
| `mails.json` | Every mail, in the order `/admin/mail` lists them: what it is, who gets it, when, and the sample its preview is filled with. |
| `layout.html` | The frame around every mail: the shop's name above, its address below, the mail as `{{{content}}}`. |
| `_order-summary.html` | A part, not a mail: the lines, shipping and total both order mails show. |
| everything else | One mail each, named as in `mails.json`. |
| `sr-Latn/` | The same mails in Serbian, and `mails.json` with Serbian descriptions and samples. |

## Languages

The files here are English. A folder named after a language holds the same files translated, and a shop sends the one chosen at `/admin/settings`, `language` in `shop_settings` (see `lang/README.md` at the shop's root). A file the folder lacks is taken from here, so a half-translated folder still sends every mail. `layout.html` has no words of its own and serves every language: `{{language}}` puts the language on its `<html>`.

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

`{{shopName}}`, `{{appURL}}` and `{{language}}` work in every mail. They are **Settings → Application** in the dashboard: the name the mails sign with, which PocketBase ships as Acme, and the address every link starts with. The rest are whatever the hook sending the mail hands over, and the sample in `mails.json` has every one of them. A name that is not there comes out empty.

`<!-- comments -->` are notes for whoever edits the file, and are taken out before anything is sent.

It is mail, not a web page: tables for layout, styles inline on each element, no scripts. Plenty of mail programs read nothing else.

## Who sends what

| Mail | Sent by |
|---|---|
| `order-confirmation`, `shop-new-order` | `pb_hooks/orders.pb.js`, as an order is placed |
| `shop-new-question` | `pb_hooks/chat.pb.js`, as a question starts waiting |
| `chat-reply` | `pb_hooks/inbox.pb.js`, a job that runs every minute |
| `verify-email`, `reset-password`, `confirm-email-change`, `login-alert` | PocketBase itself; `pb_hooks/mail.pb.js` swaps its text for these |

The mail templates on the users collection in the dashboard no longer decide anything: the hooks replace what PocketBase makes from them. Should one of these files fail to fill, PocketBase's own message goes out in its place rather than none at all.

A new mail is a file here, an entry in `mails.json`, and a hook that calls `require(__hooks + '/mailer.js').send(name, data, to)` — and the same file and entry in every language folder. Money the hook hands over is already written in the shop's language, by `lang.money()` in `pb_hooks/lang.js`.
