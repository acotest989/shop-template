import { createApp } from 'alpineshell';

import { app } from './app.js';
import { t, i18n } from './lib/i18n.js';
import { shopName } from './lib/shop.js';
import { session } from './stores/session.js';
import { cart } from './stores/cart.js';
import { theme } from './stores/theme.js';
import { chat } from './stores/chat.js';
import { chatWidget } from './partials/chat.js';
import { homePage } from './pages/shop/home.js';
import { productPage } from './pages/shop/product.js';
import { checkoutPage } from './pages/shop/checkout.js';
import { accountPage } from './pages/account/overview.js';
import { loginPage } from './pages/account/login.js';
import { registerPage } from './pages/account/register.js';
import { verifyPage } from './pages/account/verify.js';
import { forgotPage } from './pages/account/forgot.js';
import { resetPage } from './pages/account/reset.js';
import { confirmEmailPage } from './pages/account/confirm-email.js';
import { adminOverviewPage } from './pages/admin/overview.js';
import { adminInboxPage } from './pages/admin/inbox.js';
import { adminOrdersPage } from './pages/admin/orders.js';
import { adminProductsPage } from './pages/admin/products.js';
import { adminProductPage } from './pages/admin/product.js';
import { adminMailPage } from './pages/admin/mail.js';
import { adminSettingsPage } from './pages/admin/settings.js';

// The chrome around a page, which depends on the part of the shop it is in. Signing in, and the
// pages a mail links to, stand alone above the footer; the admin area wears its own header, with
// the tabs, and no footer. Every other page has the shop's header and footer.
const alone = (page) => ({ page, header: false, footer: true });
const admin = (page) => ({ page, header: 'admin/header', footer: false });

// Path -> page. A page's name is where it lives, 'shop/cart' being /pages/shop/cart.html, and
// its title is the shop's text title.shop.cart.
const routes = {
  notfound: '404',

  '/': 'shop/home',
  '/products/:handle': 'shop/product',
  '/cart': 'shop/cart',
  '/checkout': 'shop/checkout',

  '/account': 'account/overview',
  '/login': alone('account/login'),
  '/register': alone('account/register'),
  // The paths the mail templates link to; the token is the whole point of the route.
  '/verify/:token': alone('account/verify'),
  '/forgot-password': alone('account/forgot'),
  '/reset-password/:token': alone('account/reset'),
  '/confirm-email/:token': alone('account/confirm-email'),

  '/admin': admin('admin/overview'),
  '/admin/inbox': admin('admin/inbox'),
  '/admin/orders': admin('admin/orders'),
  '/admin/products': admin('admin/products'),
  '/admin/products/:id': admin('admin/product'), // 'new' for a product that is not there yet
  '/admin/mail': admin('admin/mail'),
  '/admin/settings': admin('admin/settings'),
};

const pageNames = Object.values(routes).map((route) => route.page ?? route);

createApp({
  app, // state and methods merged into the root component, reachable from every page
  theme: '/assets/theme.css',
  debug: true, // boot log + window.dbg
  routes,
  protected: ['/account'], // register protected route here
  // More than a session. Signed out, /admin goes to the login page like any protected route;
  // signed in without `admin`, home, before anything of it renders. What an account may read
  // or change there is still the server's to refuse.
  allow: {
    '/admin': (session) => session.user?.admin === true,
  },
  // Every page has one, from the shop's texts, since a title the framework made of a name would
  // be English. The admin area's are there too: those texts arrive before any route renders.
  titles: Object.fromEntries(pageNames.map((page) => [page, t('title.' + page.replaceAll('/', '.'))])),
  stores: { session, cart, theme, chat, i18n }, // register new store here
  // Only partials you render yourself with x-html; header and footer are fetched by the router.
  partials: ['card', 'toast', 'scrolltop', 'chat'],
  // register new page data here, and the component of a partial that has one
  pages: {
    homePage, productPage, checkoutPage,
    accountPage, loginPage, registerPage, verifyPage, forgotPage, resetPage, confirmEmailPage,
    adminOverviewPage, adminInboxPage, adminOrdersPage, adminProductsPage, adminProductPage,
    adminMailPage, adminSettingsPage,
    chatWidget,
  },
  // What AlpineShell says itself when something breaks, in the shop's language.
  texts: {
    error: t('shell.error'),
    checkForm: t('validation.checkForm'),
    pageFailed: t('shell.pageFailed'),
    pageNotLoaded: t('shell.pageNotLoaded'),
    partialNotLoaded: t('shell.partialNotLoaded'),
    timedOut: t('shell.timedOut'),
  },
  // The suffix after every page's title. Not document.title, the default: a product's page
  // arrives titled with the product already (pb_hooks/site.pb.js).
  siteName: shopName,
  // Defaults in effect — uncomment to change:
  // loginPath: '/login',        // where the guard sends a signed-out visitor
  // homePath: '/',              // fallback for redirects and goBack()
  // pagesDir: '/pages',         // '<page>.html' is looked up here
  // partialsDir: '/partials',   // change partials directory
  // targetId: 'page',           // element the router renders into
  // header: 'header',           // partial above every page, false drops it everywhere
  // footer: 'footer',           // same below; a route can override either one
});
