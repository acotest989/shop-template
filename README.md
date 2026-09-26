# Shop

A demo storefront built on **AlpineShell** — structure and conventions for Alpine.js apps: routing, pages, partials and stores, without a build step. Every dependency comes from a CDN as an ES module; there is no package manager.

The framework is [AlpineShell](https://github.com/acotest989/alpineshell), pulled from a CDN and pinned to a tag in the import map in `pb_public/index.html`. Point that entry at `/alpineshell/index.js` and drop a copy of the framework into `pb_public/alpineshell/` to work on it locally.

## Running it

The repository is a PocketBase app, laid out the way PocketBase looks for one: the shop's files in `pb_public/`, its server code in `pb_hooks/`, its schema in `pb_migrations/`. One process serves both halves, and needs no flags:

```bash
./setup.sh                    # or .\setup.ps1 — fetches the pinned PocketBase
./pocketbase serve            # or .\pocketbase.exe serve
./pocketbase superuser create you@example.com yourpassword   # first run only
```

That is the whole shop on `http://127.0.0.1:8090`, with the dashboard at `/_/`: PocketBase answers `/api` and serves `pb_public/` for everything else. Same origin, so there is nothing to configure for CORS and the SDK needs no host — `services/pb.js` points at `/`.

The first `serve` applies everything in `pb_migrations/`: the collections, the rate limits, the chat's ready-made questions and a catalogue of 105 products across 21 categories. There is no seeding step to run.

`--indexFallback` is on by default, and it is the SPA fallback: an unknown path returns `index.html`, so a refresh on `/products/some-handle` still boots the app. Because of it, **all asset paths must start from the root** (`/main.js`, `/assets/theme.css`, `/partials/…`) — a relative path would resolve against the current route and break on any multi-segment URL. ES module imports are the exception: they resolve against the module, not the document, so they stay relative.

Sign in with `demo@shop.test` / `test1234`, or register your own account.

## Accounts

The whole surface is real, not stubbed: register, email verification, password reset, changing your name, email or password, and deleting the account. Of a customer's pages, `/account` is the only guarded one; the admin area asks for more, and has its own section below.

Checkout is deliberately not one of them. Ordering as a guest opens an account for the address given, and the confirmation carries the link for choosing a password — no password is ever sent. Every order therefore has an owner, which is what lets `/account` list them and what keeps one visitor from reading another's.

Three of those arrive by email, and PocketBase's stock templates link to its own dashboard rather than to this app. These come from files in `pb_hooks/mail/` instead, like every mail the shop sends, and link to the app — the token is the only required part of each URL:

| | |
|---|---|
| Verification | `{APP_URL}/verify/{TOKEN}` |
| Password reset | `{APP_URL}/reset-password/{TOKEN}` |
| Email change | `{APP_URL}/confirm-email/{TOKEN}` |

What a file cannot carry is application settings, so two things stay manual: the application's URL and name under **Settings → Application** — every link in a mail starts with the one, and the other is the shop's name wherever it appears, in the header, the footer, every page's title and every mail; PocketBase ships it as Acme — and SMTP under **Settings → Mail**, since the built-in sendmail will not deliver.

Two behaviours worth knowing before they surprise you. Changing a password or an email invalidates every token the account has, so the app signs itself out on purpose. And `/forgot-password` answers the same way whether or not the address has an account, because the honest answer would tell a stranger who is registered here.

Live Server also works, pointed at `pb_public/`, and brings reload-on-save, but then the API is on another origin — add a proxy so `/api` forwards to `127.0.0.1:8090` — and `index.html` arrives as written: English, without the language, colour and search-engine tags `pb_hooks/site.pb.js` writes into it.

## Layout

```
pb_public/          what the browser gets, served as it is
  index.html        shell: partial slots and the #page render target
  main.js           entry point: the app's whole configuration
  app.js            extras merged into the root component (money, signIn, signOut)
  assets/
    main.css        loaded with a <link>: x-cloak, before any JS runs
    theme.css       design system (.card, .btn, .input, .badge…)
  pages/            one .html + one .js per route, in shop/, account/ and admin/
  partials/         markup reused across routes, and chrome that outlives them; admin/ has the admin area's
  stores/           Alpine stores (state that outlives a page)
  services/         talks to the outside world; only place that knows endpoints
  models/           what the app's own records look like; API shapes stop here
  lib/              money, dates, storage keys, t(); helpers.js takes what has no subject yet
  lang/             every sentence on screen, one folder per language
pb_hooks/           whatever the browser must not decide
  mail/             every mail the shop sends, as a template
  lang/             what the hooks say, one file per language
pb_migrations/      the schema, and what a fresh install starts with
Dockerfile          the same three folders, beside the Linux binary
setup.ps1, setup.sh, .pb-version    the pinned PocketBase, fetched for this machine
```

The front end's paths below leave out `pb_public/`: `services/pb.js` is `pb_public/services/pb.js`.

A route is one line: `'/products/:handle': 'shop/product'`. A page's name is where it lives, so the framework fetches `/pages/shop/product.html`, and its title is the shop's text of the same name, `title.shop.product`. The page's own markup names its component (`x-data="productPage"`), which `main.js` registers.

The pages are in three parts of the shop, `shop/`, `account/` and `admin/`, and the chrome around one follows from which: `admin('admin/orders')` in `main.js` gives it the admin area's header, `partials/admin/header.html`, and no footer, and `alone('account/login')` leaves out the header for signing in and for the pages a mail links to.

## Decisions worth knowing

**No build step.** Tailwind runs through its browser build, which compiles CSS at runtime and only reads `<style type="text/tailwindcss">` tags — it supports neither `<link>` nor `@import` for local files. That is why `assets/theme.css` is fetched and injected as a style tag by the framework. The compiler goes to the visitor along with the page, and that is a trade the framework makes on purpose — right for a demo like this one, wrong for a content site living on search traffic.

No build also means no version in a filename, so nothing tells a browser that `app.js` changed. `pb_hooks/cache.pb.js` sends `Cache-Control: no-cache` with everything outside `/api/`: the browser keeps its copy but asks before using it, and an unchanged file costs a 304. Without it, a file nobody touched for weeks can stay in a visitor's cache for days after a deploy, next to newer files that expect it to have changed.

**Data lives behind `services/`.** Pages never fetch anything themselves, and never see where the data came from: `services/products.js` asks PocketBase, `models/product.js` turns a record into the app's own product, and the column names stop there — `price_cents` becomes `price`, `regular_price_cents` becomes `regularPrice`. Searching, filtering by category, sorting and paging all happen in the database: a page hands over a term, a category and a page number, and gets back one page of products with the count behind it.

That boundary has been tested twice rather than asserted. Sign-in moved from a hard-coded demo user to PocketBase: `services/auth.js`, `services/pb.js`, `models/user.js` and `stores/session.js` changed, while `pages/account/login.html`, `pages/account/login.js` and `app.js` did not. The catalogue then moved the same way, from dummyjson to a `products` collection, and `pages/shop/home.js` and `pages/shop/product.js` were not opened at all. Orders were the last of it, and `services/mock.js` went with them — nothing in this app is faked any more.

**State ownership.** Page-specific state (products, loading, errors) belongs to the page component. Anything shared across routes and written from outside Alpine — the session — is a store, because plain component data cannot be updated reactively from module code such as the router's auth guard. The cart is a store for the same reason: the header badge, the product card and `/cart` all read it, and it survives a reload through `$persist`. It works the other way round too — `pages/shop/cart.html` has no `x-data` at all, because a page whose state lives in a store needs no component of its own.

**A cart line is not a product.** `stores/cart.js` copies nine fields out of a product instead of spreading it. The price is a snapshot of what the visitor agreed to; everything else in `localStorage` would be stale data pretending to be fresh, and every future API field would silently become part of a schema that has to survive across releases.

**Price and stock are the server's.** The `orders` collection refuses every write, so `pb_hooks/orders.pb.js` is the only way one is made. The cart does send the prices and the shipping it displayed, but only so the hook can refuse an order that was priced differently, or that would cost more to ship than the page said — every amount stored is read from the `products` records and the hook's own shipping rules. Stock is checked and lowered inside the same transaction, so an order that exists is an order whose stock was taken, and a refusal leaves the shelf where it was. No order takes more than ten of one product: the rate limit bounds how many made-up cash-on-delivery orders one visitor can place, and the cap bounds what each of them can take off a shelf. Two statuses put goods back, `cancelled` and `returned`: setting either, at `/admin/orders`, in the dashboard or anywhere else, restocks the order's lines and undoes the sale. Moving the order off them again takes the goods once more, and is refused if they have been sold since.

**Every sentence is a key.** No template or script writes English into the page: a template asks `t('cart.empty')`, a script `t('cart.added', { title })`, and `lang/<language>/` answers — `shop.js` for everything a customer sees, `admin.js` for the admin area alone, fetched only for an admin, so a customer never downloads it. The shop speaks one language, English or Serbian as shipped, chosen at `/admin/settings`: the pages, the mails, the hooks' messages and Telegram all follow it, the pages because `pb_hooks/site.pb.js` writes it into `index.html` — `lang` on `<html>` and two entries of the import map — on every load; the dictionary also names the locale money and dates are written in. Because the shop's dictionary is part of the module graph, no page ever renders before it; the admin part fills in on screen when it lands. Plurals follow `Intl.PluralRules`, which is what Serbian's three forms need. Products and the chat's ready-made questions are content, and stay in whatever language they were written in. How to write an entry, and add a language, is in `lang/README.md`.

**Forms are the framework's, validation is the app's.** Every form here spreads `form()` and keeps only `validate()` and `save()`. What the browser can decide never reaches the network; what only the server knows — that an address is taken — comes back as a message on that field. The sequence around it, including refusing a second submit, is not written here at all.

**Routing.** Route templates are fetched by the router and rendered into `#page`. Links are plain `<a href>`; the router intercepts clicks itself, which keeps Ctrl+click and keyboard behaviour intact. Scroll reset, focus movement and page titles are handled on router events, since the router does none of them.

**Dark mode is a palette, not a set of classes.** Tailwind's colours are CSS variables, so `assets/theme.css` gives `.dark` on `<html>` a second set of values for the same names — the pale end of each scale trades places with the deep end — and no template carries a `dark:` twin beside its colours, or needs one to join in. Two kinds of block keep the light palette in both themes, marked `light-palette`: the footer, a dark band already, and product photos, whose cut-out pictures of black watches and phones would vanish into a dark ground. The class is set before the first paint by a few lines at the top of `index.html`, from the visitor's choice or, until they make one, the system setting; `stores/theme.js` takes over from there, behind the switch in the header.

**The accent is one attribute.** Primary buttons, the cart count, the active link, the chosen payment option and focus draw on five `brand` roles in `assets/theme.css`, and each defaults to the ink the shop has always worn. Choosing `violet`, `indigo`, `teal`, `orange` or `lime` at `/admin/settings` swaps a colour in, for both themes: `pb_hooks/site.pb.js` writes it into `index.html` as `data-accent` on `<html>` on every load, and the settings page shows each colour on a swatch and on itself before it is saved. Text, prices and the badges that report an order's state keep their own colours, so a state never passes for decoration: amber still means something is owed, green that something worked.

**A guest's conversation is the shop's, not theirs to fetch.** The chat on a product page offers the questions in the `faqs` collection, edited in the dashboard, and a box for whatever they do not answer: 500 characters a question, three questions for a guest, no count for a customer. Every browser names itself once with `crypto.randomUUID()` and keeps the id in `localStorage`, so the shop sees the same visitor come back. The id travels with every question and is never taken as proof of anything. `threads` and `messages` refuse every write from a browser and every read without an account, `pb_hooks/chat.pb.js` is the only way in, and nothing hands a guest's conversation back. What a guest sees is what the tab kept in `sessionStorage`, and a transcript written under another id is dropped. A new id buys three more questions, so the route has a rate limit of its own, looser than an order's because picks from the list go through it too.

**A customer's conversation is the server's.** Signed in, the chat reads what has been said about the product, which the collection rules narrow to the customer's own threads, and subscribes to it, so a reply appears the moment it is saved. Signing in or registering hands the browser's guest questions to the account, merged into any conversation the account already had about the same product. The browser's id is all that ties them together, so on a shared computer they go to whoever signs in next. The answer to a picked question is never stored: it is drawn from the list after the question, the way it was the first time, so an answer changed in the dashboard changes in old conversations too.

**The admin area is part of the shop, not the dashboard.** Its routes wear their own header, `partials/admin/header.html`, with a tab for each page: an overview of what wants attention (conversations waiting, orders today, orders not shipped, products running low), the inbox, the orders, where status and payment are set in place, the products, and the mail. `allow` in `main.js` keeps it out of sight: signed out, `/admin` goes to the login page like any protected route; signed in without `admin`, home, before a single template of it is fetched. The server refuses such an account the data regardless, and has to, since the page files themselves are as public as any. With `admin` reaching every order and conversation, the customer's own lists name the account in their filter, so an admin shopping as a customer sees only their own.

**The inbox is a page of the shop, not the dashboard.** `/admin/inbox` lists every conversation, newest first, with the ones waiting on an answer apart, and realtime keeps the list and the open conversation current. Neither the inbox nor the chat waits on realtime, though: its connection is a stream some proxies and networks hold back, so both load straight away, turn live once the connection is up, and read once more then so nothing sent in between is missed. Without it they still work, and a reload shows what is new; the inbox says so after ten seconds. It opens for an account with `admin` ticked, and the dashboard is the only place to tick it: the users rules refuse the field from a browser, in a signup as in a profile update. An admin reads every thread and message through the collection rules, but writes only through `pb_hooks/inbox.pb.js`, so a reply is the one thing the account can add. A written question leaves its thread waiting and a reply clears it; a conversation that needs no answer can be marked answered without one, and any conversation can be deleted, with every message in it, for good, or the whole inbox at once.

**Search engines read what the server writes.** The shop is drawn in the browser, and link previews run no script at all — Google is the exception rather than the rule — so whatever they need is written into `index.html` before it leaves: `pb_hooks/site.pb.js` gives a product's address its own title, description, picture and price as Open Graph tags, a canonical address, and the product as schema.org `Product` data for rich results. An address with no product behind it, or a hidden one, still opens the page, which says so, but answers 404 and asks not to be indexed. `pb_hooks/seo.pb.js` serves `/sitemap.xml`, the front page and every product for sale, and `/robots.txt`, which keeps crawlers out of accounts, the cart, checkout and the admin area. Both build their addresses from **Application URL** in the dashboard, so they mean something once that is the real domain.

**Every mail is a file.** Eight of them, and each is an HTML template in `pb_hooks/mail/` with its subject as the `<title>`, framed by one `layout.html`: the order confirmation and the shop's copy, the chat question and the reply, and PocketBase's four account mails, whose text `pb_hooks/mail.pb.js` swaps for ours as they go. `pb_hooks/mailer.js` fills them, reading the files on every send, so an edit is live without a restart. `/admin/mail` lists them all with who gets each and when, shows each one filled with the sample data in `mails.json`, at desktop and at phone width and as the plain text every mail also carries, and sends any of them as a test to the admin's own address. The syntax is in `pb_hooks/mail/README.md`.

**A product is hidden, never deleted.** `/admin/products` lists the whole catalogue and edits every field of a product, through `pb_hooks/products.pb.js`; a new one gets its address from its name, once, so links already shared keep working. Taking a product out of the shop is `hidden`: the collection rules keep it from everybody but an admin, the catalogue asks for `hidden = false` by name so an admin browsing the shop sees what a customer does, and checkout and the chat refuse it. Nothing deletes one, because orders and conversations name it and a cancelled or returned order puts its goods back on it. Stock is written only over the number the form opened with: an order placed while the page was open is not undone by saving it, and a changed number that meets one is refused with the stock as it now stands.

## For the owner

The admin area opens at `/admin` once `admin` is ticked on your account under **users** in the dashboard; sign out and in again for the shop to see it.

The shop gets a mail, at the address it sends from, when a conversation starts waiting on it: once per question, however many messages follow before the reply. A customer who has the chat open when the shop replies gets no mail. One who does not see the reply within five minutes gets a single mail, whatever else the shop adds before they come back, with a link that opens the product with the chat open. A job in `pb_hooks/inbox.pb.js` checks every minute, so the mail leaves between five and six minutes after the reply. A guest has no address, and gets nothing.

The owner's phone can hear of it too, through a Telegram bot: one message for every question that starts waiting and every order placed, sent by `pb_hooks/telegram.js`. Make the bot with @BotFather (`/newbot`), press Start in a chat with it, and open `https://api.telegram.org/bot<token>/getUpdates`: the number after `"chat":{"id":` is the chat. Both go into the one record of `shop_settings` in the dashboard, never into this repository, since the token is the bot's password. Left empty, nothing is sent; a message that fails is logged under **Logs**, and the question or the order stands.

Four switches in the same record decide which of the two tells the owner what — `mail_questions`, `mail_orders`, `telegram_questions`, `telegram_orders` — all on to begin with, and set at `/admin/settings` as well as in the dashboard. They cover the owner's notices only: the buyer's confirmation and the mail about a chat reply go to customers either way.

## The server

[PocketBase](https://pocketbase.io): one binary that is the database, the auth provider, the file storage and the API.

The binary is not in git: ~33 MB, one build per platform, and the deploy uses the Linux one. It is fetched instead, from the version pinned in **`.pb-version`** — the only place that number appears, so an upgrade is one line and both the setup script and the Dockerfile follow it.

| | |
|---|---|
| `pb_public/` | **committed** — the shop's files, served as they are. |
| `pb_migrations/` | **committed** — the schema as code. Change a collection in the dashboard and PocketBase writes the migration itself; commit it, and a fresh checkout gets the same collections. |
| `pb_hooks/` | **committed** — server-side logic, the mails and the server's sentences; see the README in there. |
| `.pb-version`, `setup.*`, `Dockerfile` | **committed** — how the binary is obtained, in dev and in production. |
| `pb_data/` | ignored — the database and uploaded files. It sits beside `pb_public/`, not in it, so nothing serves it. |
| the binary | ignored — see above. |

Records are data, not schema, so the demo account does not travel with the repository: it is a record in the `users` collection, created by hand after the first `serve`. Settings are the other exception: unlike collections, PocketBase does not write them to a migration when you change them in the dashboard. Anything that must survive a fresh checkout — the rate limits, for instance — is a hand-written migration.

To try the shop from a phone before it is deployed, a Cloudflare quick tunnel gives this machine a public HTTPS address, with no account and no open port: `cloudflared tunnel --url http://127.0.0.1:8090`. Set **Application URL** to the address it prints, so the links in mails and Telegram messages lead there, and back afterwards; the address changes every time the tunnel starts. A quick tunnel holds back Server-Sent Events, which is what realtime runs on, so nothing arrives live through it — the chat and the inbox load and work, and a reload shows what is new.

## Before it goes public

None of this matters on `127.0.0.1`, and all of it matters the day the URL is real.

- **Trusted proxy headers** (Settings → Application). Behind a reverse proxy every request appears to come from the proxy, so the rate limiter would count the whole world as one client and one flood would lock everybody out.
- **Restrict the superuser** to your own IP or subnet, and turn on MFA for it.
- **Backups to S3-compatible storage** on a schedule. A single-node SQLite database is exactly as durable as the disk under it.
- **`{APP_URL}` under Settings → Application.** A fresh install sets it to `http://localhost:8090`, and every mail template builds its link from it, as do the sitemap, `robots.txt` and a product page's canonical address — so locally nothing ever complains, and in production every verification and reset link sends your customers to their own machine. Nothing fails loudly; you find out from the first real account. The **Application name** beside it is the shop's name everywhere — the header, the footer, page titles, link previews and every mail — and it ships as Acme.
- **SMTP on the real domain**, with SPF and DKIM, or the verification and reset mail lands in spam.
- **Pin the version** — see below — and read the changelog before upgrading.

## Deploying

The `Dockerfile` builds from this root:

```bash
docker build --build-arg PB_VERSION=$(cat .pb-version) -t shop .
docker run -p 8090:8090 -v pb_data:/pb/pb_data shop
```

It puts `pb_public/`, `pb_hooks/` and `pb_migrations/` beside the binary, where they are here, so what runs there is what runs on your machine. Mount `pb_data` as a volume or the first redeploy takes every account and order with it.

## Pin the version

PocketBase is still pre-1.0 and its own documentation says backward compatibility is not guaranteed until then. Upgrading is one line — bump `.pb-version` and re-run the setup script — but read the changelog first, never blindly. What the newest release is:

```powershell
(Invoke-RestMethod https://api.github.com/repos/pocketbase/pocketbase/releases/latest).tag_name
```

## Not done yet

Cash on delivery is what the checkout offers, and it is not simulated: such an order is genuinely unpaid. Nothing here talks to a courier either, so an order's progress is set by hand at `/admin/orders` as the courier reports it — `shipped`, then `delivered`, or `returned` when the parcel is refused at the door — and `paid` is ticked once the courier pays the money over.

Shipping is one flat rate per order, 15 in whatever currency the shop prices in, and free for an order worth 300 or more that weighs no more than 20 kg — `SHIPPING`, `FREE_FROM` and `FREE_UP_TO` in the hook and in `stores/cart.js`. Every product carries its packed weight in grams, and the collection requires one; the demo catalogue's are estimates by category, so real products need real ones. The courier charges by weight, and pricing by weight would start from the same field.

Card is off — the radio is disabled and `pb_hooks/orders.pb.js` refuses one, because a disabled radio is only a suggestion and a POST naming `card` would otherwise walk away with an order marked paid. Nothing underneath it was removed: the collection still keeps the value, the hook still has the line that marks such an order paid, and the mail still has its sentence. Turning it on is `CARD_PAYMENT` in the hook and `cardPayment` in `pages/shop/checkout.js` — and that line marking it paid is where a real provider goes.

Nothing writes to a customer about an order but the order's own confirmation: a delayed parcel, say, is a mail sent from somewhere else for now. And nothing reaches a phone but Telegram's messages: the shop is not an installable app, and there is no web push.

On the accounts side, what is left is optional: OAuth2 providers.

What is not optional is the trusted proxy header, under **Settings → Application**, before any of this is public. Every rate limit here counts per IP address, placing an order included, and behind a proxy every visitor arrives from the proxy's own: the shop would take five orders every ten minutes from the whole world. Which header depends on the host — `Fly-Client-IP` on Fly.io, `CF-Connecting-IP` behind Cloudflare — so no migration sets it. A header the proxy does not overwrite is one any visitor can write, and every limit would count whatever address they claim.

Two things here needed a change to AlpineShell: `allow`, so the admin area stays out of sight of anybody who is not an admin, released in 0.5.4; and `texts`, so the few sentences the framework says itself come out in the shop's language, released in 0.5.6. The cart, search, checkout and chat are all stores, pages, services and routes.
