# Languages

Every sentence the shop shows is a key here, looked up with `t()`: `x-text="t('cart.empty')"` in a template, `t('cart.added', { title })` in a script. One folder per language, two files in each:

| File | What is in it |
|---|---|
| `shop.js` | everything a customer can see, and what the admin area shares with it: page titles, Save, the order statuses |
| `admin.js` | the admin area's own sentences, every key starting with `admin.` — fetched only for an account with `admin` ticked, so a customer never downloads it |

Two languages ship with the shop:

| Folder | Language | Money and dates |
|---|---|---|
| `en/` | English | €12.99, 26 Sept 2026 |
| `sr-Latn/` | Serbian, Latin script, ijekavian — customers are addressed as "Vi", the admin area as "ti" | 12,99 €, 26. 9. 2026. |

The shop speaks one language at a time, chosen in the admin area under **Settings**, and kept as `language` in the `shop_settings` record. Everything follows it:

- **the pages.** `index.html` names the language in `lang` on `<html>` and in two entries of its import map, `lang/shop` and `lang/admin`, which `lib/i18n.js` loads. `server/pb_hooks/site.pb.js` rewrites all three on every load, along with the `<title>` and the description, which search engines and link previews read without running a script (`site.title` and `site.description` in `server/lang/`). The file itself stays English, and goes out as it is only if the server cannot read it.
- **the server.** The mails (`server/mail/`), what the hooks answer a page with (a product that sold out while in the cart, say), and the Telegram messages (`server/lang/`).
- **what nobody wrote here.** Whatever PocketBase itself says — no connection, too many attempts, a crash — `services/pb.js` puts into the page's language on the way in, and the few sentences AlpineShell says itself are the `shell.` keys, handed to it as `texts` in `main.js`.

## Writing an entry

```js
export const locale = 'en-GB'; // money and dates: €12.99, 26 Sept 2026

export default {
  'cart.empty': 'Your cart is empty.',
  'cart.added': '{title} added to cart.',                      // {name} is filled in
  'home.count': { one: '{n} product', other: '{n} products' }, // plural forms, picked by {n}
};
```

Plural forms are the ones `Intl.PluralRules` names for the language: English has `one` and `other`; Serbian `one` (1, 21, 31…), `few` (2–4, 22–24…) and `other` (5–20, 25…). An entry without the form a number needs falls back to `other`.

Keys read as `page.what`, so a template says what it shows. A key missing from a dictionary shows as the key itself, with a warning in the console — except an `admin.` key while `admin.js` is still on its way, which shows nothing for that moment.

## Adding a language

Copy `en/` to a folder named after the language (`de`, `hr`…), translate the values, keep the keys, and set `locale`. Every dictionary has the same keys as `en/`, and each entry the same `{names}` as its English one.

The server's side is three more things: `server/lang/en.json` copied under the language's name and translated (same syntax, plus how money is written); the mails, as a folder of the same name in `server/mail/`; and the language added to the choices of `language` in `shop_settings`, by a migration, after which Settings offers it. A language other than English and its neighbours also needs its plural rule in `server/pb_hooks/lang.js`, whose engine has no `Intl`.
