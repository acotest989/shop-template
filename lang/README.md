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

The shop speaks one language at a time, chosen in `index.html`:

```html
<html lang="sr-Latn">
…
"lang/shop": "/lang/sr-Latn/shop.js",
"lang/admin": "/lang/sr-Latn/admin.js"
```

The `<title>` and the description in the same file's `<head>` are for search engines and link previews, which read the page as it was served, so they are written there in the shop's language too.

The server never reads `index.html`, so it is told separately: **`language`** in the `shop_settings` record, in the dashboard, set to the same one. That is the language of the mails (`server/mail/`), of what the hooks answer a page with (a product that sold out while in the cart, say), and of the Telegram messages (`server/lang/`). Whatever PocketBase itself says — no connection, too many attempts, a crash — `services/pb.js` puts into the page's language on the way in.

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

Copy `en/` to a folder named after the language (`de`, `hr`…), translate the values, keep the keys, set `locale`, and point `index.html` at it. Every dictionary has the same keys as `en/`, and each entry the same `{names}` as its English one.

The server's side is three more things: `server/lang/en.json` copied under the language's name and translated (same syntax, plus how money is written); the mails, as a folder of the same name in `server/mail/`; and the language added to the choices of `language` in `shop_settings`, by a migration. A language other than English and its neighbours also needs its plural rule in `server/pb_hooks/lang.js`, whose engine has no `Intl`.
