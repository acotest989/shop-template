# Shop

A demo storefront built on **AlpineShell** — structure and conventions for Alpine.js apps: routing, pages, partials and stores, without a build step. Every dependency comes from a CDN as an ES module; there is no package manager.

The framework is [AlpineShell](https://github.com/acotest989/alpineshell), pulled from a CDN and pinned to a tag in the import map in `index.html`. Point that entry at `/alpineshell/index.js` and drop a copy of the framework in to work on it locally.

## Running it

One process serves both halves — see [server/README.md](server/README.md):

```bash
cd server
./setup.sh                          # or .\setup.ps1 — fetches the pinned PocketBase
./pocketbase serve --publicDir=..
```

That is the whole shop on `http://127.0.0.1:8090`: PocketBase answers `/api` and serves these files for everything else. Same origin, so there is nothing to configure for CORS and the SDK needs no host — `services/pb.js` points at `/`.

The first `serve` applies everything in `server/pb_migrations/`: the collections, the mail templates, and a catalogue of 105 products across 21 categories. There is no seeding step to run.

`--indexFallback` is on by default, and it is the SPA fallback: an unknown path returns `index.html`, so a refresh on `/products/some-handle` still boots the app. Because of it, **all asset paths must start from the root** (`/main.js`, `/assets/theme.css`, `/partials/…`) — a relative path would resolve against the current route and break on any multi-segment URL. ES module imports are the exception: they resolve against the module, not the document, so they stay relative.

Sign in with `demo@shop.test` / `test1234`, or register your own account.

## Accounts

The whole surface is real, not stubbed: register, email verification, password reset, changing your name, email or password, and deleting the account. `/account` is the only guarded route.

Checkout is deliberately not one of them. Ordering as a guest opens an account for the address given, and the confirmation carries the link for choosing a password — no password is ever sent. Every order therefore has an owner, which is what lets `/account` list them and what keeps one visitor from reading another's.

Three of those arrive by email, and PocketBase's stock templates link to its own dashboard rather than to this app. The migrations rewrite them, so there is nothing to click — the token is the only required part of each URL:

| | |
|---|---|
| Verification | `{APP_URL}/verify/{TOKEN}` |
| Password reset | `{APP_URL}/reset-password/{TOKEN}` |
| Email change | `{APP_URL}/confirm-email/{TOKEN}` |

What a migration cannot carry is application settings, so two things stay manual: `{APP_URL}` under **Settings → Application**, and SMTP under **Settings → Mail** — the built-in sendmail will not deliver.

Two behaviours worth knowing before they surprise you. Changing a password or an email invalidates every token the account has, so the app signs itself out on purpose. And `/forgot-password` answers the same way whether or not the address has an account, because the honest answer would tell a stranger who is registered here.

Live Server also works, and brings reload-on-save, but then the API is on another origin: add a proxy so `/api` forwards to `127.0.0.1:8090`, and exclude `server/pb_data/**` from the watcher — otherwise every write to the database reloads the page.

## Layout

```

index.html        shell: partial slots and the #page render target
main.js           entry point: the app's whole configuration
app.js            extras merged into the root component (money, signIn, signOut)
assets/
  main.css        loaded with a <link>: x-cloak, before any JS runs
  theme.css       design system (.card, .btn, .input, .badge…)

pages/            one .html + one .js per route
partials/         markup reused across routes, and chrome that outlives them
stores/           Alpine stores (state that outlives a page)
services/         talks to the outside world; only place that knows endpoints
models/           what the app's own records look like; API shapes stop here
lib/              money, dates, storage keys; helpers.js takes what has no subject yet
server/           PocketBase: the database, auth and API in one binary
```

A route is one line: `'/products/:handle': 'product'`. From that name the framework derives the template (`/pages/product.html`) and the title (`Product`, overridable in `titles`). The page's own markup names its component (`x-data="productPage"`), which `main.js` registers.

Routes that need different chrome take an object instead: `'/login': { page: 'login', header: false, footer: false }`.

## Decisions worth knowing

**No build step.** Tailwind runs through its browser build, which compiles CSS at runtime and only reads `<style type="text/tailwindcss">` tags — it supports neither `<link>` nor `@import` for local files. That is why `assets/theme.css` is fetched and injected as a style tag by the framework. The compiler goes to the visitor along with the page, and that is a trade the framework makes on purpose — right for a demo like this one, wrong for a content site living on search traffic.

**Data lives behind `services/`.** Pages never fetch anything themselves, and never see where the data came from: `services/products.js` asks PocketBase, `models/product.js` turns a record into the app's own product, and the column names stop there — `price_cents` becomes `price`, `regular_price_cents` becomes `regularPrice`. Searching, filtering by category, sorting and paging all happen in the database: a page hands over a term, a category and a page number, and gets back one page of products with the count behind it.

That boundary has been tested twice rather than asserted. Sign-in moved from a hard-coded demo user to PocketBase: `services/auth.js`, `services/pb.js`, `models/user.js` and `stores/session.js` changed, while `pages/login.html`, `pages/login.js` and `app.js` did not. The catalogue then moved the same way, from dummyjson to a `products` collection, and `pages/home.js` and `pages/product.js` were not opened at all. Orders were the last of it, and `services/mock.js` went with them — nothing in this app is faked any more.

**State ownership.** Page-specific state (products, loading, errors) belongs to the page component. Anything shared across routes and written from outside Alpine — the session — is a store, because plain component data cannot be updated reactively from module code such as the router's auth guard. The cart is a store for the same reason: the header badge, the product card and `/cart` all read it, and it survives a reload through `$persist`. It works the other way round too — `pages/cart.html` has no `x-data` at all, because a page whose state lives in a store needs no component of its own.

**A cart line is not a product.** `stores/cart.js` copies nine fields out of a product instead of spreading it. The price is a snapshot of what the visitor agreed to; everything else in `localStorage` would be stale data pretending to be fresh, and every future API field would silently become part of a schema that has to survive across releases.

**Price and stock are the server's.** The `orders` collection refuses every write, so `server/pb_hooks/orders.pb.js` is the only way one is made. The cart does send the prices and the shipping it displayed, but only so the hook can refuse an order that was priced differently, or that would cost more to ship than the page said — every amount stored is read from the `products` records and the hook's own shipping rules. Stock is checked and lowered inside the same transaction, so an order that exists is an order whose stock was taken, and a refusal leaves the shelf where it was. No order takes more than ten of one product: the rate limit bounds how many made-up cash-on-delivery orders one visitor can place, and the cap bounds what each of them can take off a shelf. Two statuses put goods back, `cancelled` and `returned`: setting either, from the dashboard or anywhere else, restocks the order's lines and undoes the sale. Moving the order off them again takes the goods once more, and is refused if they have been sold since.

**Forms are the framework's, validation is the app's.** Every form here spreads `form()` and keeps only `validate()` and `save()`. What the browser can decide never reaches the network; what only the server knows — that an address is taken — comes back as a message on that field. The sequence around it, including refusing a second submit, is not written here at all.

**Routing.** Route templates are fetched by the router and rendered into `#page`. Links are plain `<a href>`; the router intercepts clicks itself, which keeps Ctrl+click and keyboard behaviour intact. Scroll reset, focus movement and page titles are handled on router events, since the router does none of them.

**Dark mode is a palette, not a set of classes.** Tailwind's colours are CSS variables, so `assets/theme.css` gives `.dark` on `<html>` a second set of values for the same names — the pale end of each scale trades places with the deep end — and no template carries a `dark:` twin beside its colours, or needs one to join in. Two kinds of block keep the light palette in both themes, marked `light-palette`: the footer, a dark band already, and product photos, whose cut-out pictures of black watches and phones would vanish into a dark ground. The class is set before the first paint by a few lines at the top of `index.html`, from the visitor's choice or, until they make one, the system setting; `stores/theme.js` takes over from there, behind the switch in the header.

**The accent is one attribute.** Primary buttons, the cart count, the active link, the chosen payment option and focus draw on five `brand` roles in `assets/theme.css`, and each defaults to the ink the shop has always worn. `data-accent` on `<html>` in `index.html` — `violet`, `indigo`, `teal`, `orange` or `lime` — swaps a colour in, for both themes. Text, prices and the badges that report an order's state keep their own colours, so a state never passes for decoration: amber still means something is owed, green that something worked.

## Not done yet

Cash on delivery is what the checkout offers, and it is not simulated: such an order is genuinely unpaid. Nothing here talks to a courier either, so an order's progress is set by hand in the dashboard as the courier reports it — `shipped`, then `delivered`, or `returned` when the parcel is refused at the door — and `paid` is ticked once the courier pays the money over.

Shipping is one flat rate per order, 15 in whatever currency the shop prices in, and free for an order worth 300 or more that weighs no more than 20 kg — `SHIPPING`, `FREE_FROM` and `FREE_UP_TO` in the hook and in `stores/cart.js`. Every product carries its packed weight in grams, and the collection requires one; the demo catalogue's are estimates by category, so real products need real ones. The courier charges by weight, and pricing by weight would start from the same field.

Card is off — the radio is disabled and `server/pb_hooks/orders.pb.js` refuses one, because a disabled radio is only a suggestion and a POST naming `card` would otherwise walk away with an order marked paid. Nothing underneath it was removed: the collection still keeps the value, the hook still has the line that marks such an order paid, and the mail still has its sentence. Turning it on is `CARD_PAYMENT` in the hook and `cardPayment` in `pages/checkout.js` — and that line marking it paid is where a real provider goes.

On the accounts side, what is left is optional: OAuth2 providers.

What is not optional is the trusted proxy header, under **Settings → Application**, before any of this is public. Every rate limit here counts per IP address, placing an order included, and behind a proxy every visitor arrives from the proxy's own: the shop would take five orders every ten minutes from the whole world. Which header depends on the host — `Fly-Client-IP` on Fly.io, `CF-Connecting-IP` behind Cloudflare — so no migration sets it. A header the proxy does not overwrite is one any visitor can write, and every limit would count whatever address they claim.

Nothing here has needed a change to AlpineShell. The cart, search and checkout are all stores, pages, services and routes.
