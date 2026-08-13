import { createApp } from './alpineshell/index.js';

import { app } from './app.js';
import { session } from './stores/session.js';
import { homePage } from './pages/home.js';
import { productPage } from './pages/product.js';
import { loginPage } from './pages/login.js';

createApp({
  app, // state and methods merged into the root component, reachable from every page
  theme: '/theme.css',
  debug: true, // boot log + window.dbg
  // path -> page name. The name gives the template (/pages/<name>.html) and the title.
  // Use an object when a route needs different chrome than the rest:
  // header/footer: omitted or true -> default partial, false -> none, 'name' -> that partial
  routes: {
    notfound: '404',
    '/': 'home',
    '/login': { page: 'login', header: false, footer: true },
    '/products/:handle': 'product',
  },
  protected: ['/admin', '/profile', '/settings', '/chat'], // register protected route here
  // Overrides only — a page with no entry gets its own name as the title.
  titles: {
    404: 'Page not found',
    home: 'Products',
    login: 'Sign in',
  },
  stores: { session }, // register new store here
  partials: ['header', 'footer', 'card', 'toast'], // register new partial here
  pages: { homePage, productPage, loginPage }, // register new page data here
  // Defaults in effect — uncomment to change:
  // siteName: document.title,   // suffix after the page title
  // loginPath: '/login',        // where the guard sends a signed-out visitor
  // homePath: '/',              // fallback for redirects and goBack()
  // pagesDir: '/pages',         // '<page>.html' is looked up here
  // partialsDir: '/partials',   // change partials directory
  // targetId: 'page',           // element the router renders into
  // header: 'header',           // partial above every page, false drops it everywhere
  // footer: 'footer',           // same below; a route can override either one
});
