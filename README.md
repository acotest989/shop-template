# Shop

A demo storefront built on **AlpineShell** — structure and conventions for Alpine.js apps: routing, pages, partials and stores, without a build step. Every dependency comes from a CDN as an ES module; there is no package manager.

The framework lives in `alpineshell/` and is meant to be extracted into its own package. The app never reaches into it — it calls `createApp()` and imports a few helpers, nothing else.

## Running it

Live Server, with the server root set to this folder:

```json
// .vscode/settings.json (workspace root)
{
  "liveServer.settings.root": "/shop",
  "liveServer.settings.file": "index.html"
}
```

`file` is the SPA fallback: every 404 returns `index.html`, so a refresh on `/products/some-handle` still boots the app. Because of it, **all asset paths must start from the root** (`/main.js`, `/theme.css`, `/partials/…`) — a relative path would resolve against the current route and break on any multi-segment URL. ES module imports are the exception: they resolve against the module, not the document, so they stay relative.

Sign in with `demo@shop.test` / `test1234`.

## Layout

```
alpineshell/      the framework
  index.js        createApp() — the whole public API
  router.js       routing, auth guard, titles, navigation events
  root.js         root component, loads partials
  http.js         fetch client, errorMessage()

index.html        shell: toast slot and #page render target
main.js           entry point: the app's whole configuration
app.js            extras merged into the root component (money, signIn, signOut)
theme.css         design system (.card, .btn, .input, .badge…)

pages/            one .html + one .js per route
partials/         markup reused across routes
stores/           Alpine stores (state that outlives a page)
services/         talks to the outside world; only place that knows endpoints
models/           what the app's own records look like; API shapes stop here
lib/              app helpers (money, discountPercent)
```

A route is one line: `'/products/:handle': 'product'`. From that name the framework derives the template (`/pages/product.html`) and the title (`Product`, overridable in `titles`). The page's own markup names its component (`x-data="productPage"`), which `main.js` registers.

Routes that need different chrome take an object instead: `'/login': { page: 'login', header: false, footer: false }`.

## Decisions worth knowing

**No build step.** Tailwind runs through its browser build, which compiles CSS at runtime and only reads `<style type="text/tailwindcss">` tags — it supports neither `<link>` nor `@import` for local files. That is why `theme.css` is fetched and injected as a style tag by the framework. A production setup would use the Tailwind CLI and ship a compiled stylesheet instead.

**Data lives behind `services/`.** Pages never fetch anything themselves, and never see the API's shape: `services/products.js` maps [dummyjson.com](https://dummyjson.com) records into the app's own product — dollars become cents, a discount percentage becomes a compare-at price, the title becomes a handle. Pointing the shop at a different API is one file. Auth is still faked in `services/auth.js`; `services/mock.js` marks what is left.

**State ownership.** Page-specific state (products, loading, errors) belongs to the page component. Anything shared across routes and written from outside Alpine — the session — is a store, because plain component data cannot be updated reactively from module code such as the router's auth guard.

**Routing.** Route templates are fetched by the router and rendered into `#page`. Links are plain `<a href>`; the router intercepts clicks itself, which keeps Ctrl+click and keyboard behaviour intact. Scroll reset, focus movement and page titles are handled on router events, since the router does none of them.

## Not done yet

The cart. "Add to cart" is the only button in the app that does nothing.
