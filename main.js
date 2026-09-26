import { createApp } from 'alpineshell';

import { app } from './app.js';
import { t, i18n } from './lib/i18n.js';
import { session } from './stores/session.js';
import { cart } from './stores/cart.js';
import { theme } from './stores/theme.js';
import { chat } from './stores/chat.js';
import { chatWidget } from './partials/chat.js';
import { homePage } from './pages/home.js';
import { productPage } from './pages/product.js';
import { loginPage } from './pages/login.js';
import { registerPage } from './pages/register.js';
import { verifyPage } from './pages/verify.js';
import { forgotPage } from './pages/forgot.js';
import { resetPage } from './pages/reset.js';
import { accountPage } from './pages/account.js';
import { confirmEmailPage } from './pages/confirm-email.js';
import { checkoutPage } from './pages/checkout.js';
import { adminPage } from './pages/admin.js';
import { inboxPage } from './pages/inbox.js';
import { ordersPage } from './pages/orders.js';
import { adminProductsPage } from './pages/admin-products.js';
import { adminProductPage } from './pages/admin-product.js';
import { adminMailPage } from './pages/admin-mail.js';
import { adminSettingsPage } from './pages/admin-settings.js';

createApp({
  app, // state and methods merged into the root component, reachable from every page
  theme: '/assets/theme.css',
  debug: true, // boot log + window.dbg
  // path -> page name. The name gives the template (/pages/<name>.html) and the title.
  // Use an object when a route needs different chrome than the rest:
  // header/footer: omitted or true -> default partial, false -> none, 'name' -> that partial
  routes: {
    notfound: '404',
    '/': 'home',
    '/login': { page: 'login', header: false, footer: true },
    '/register': { page: 'register', header: false, footer: true },
    // The paths the mail templates link to; the token is the whole point of the route.
    '/verify/:token': { page: 'verify', header: false, footer: true },
    '/forgot-password': { page: 'forgot', header: false, footer: true },
    '/reset-password/:token': { page: 'reset', header: false, footer: true },
    '/confirm-email/:token': { page: 'confirm-email', header: false, footer: true },
    '/account': 'account',
    '/products/:handle': 'product',
    '/cart': 'cart',
    '/checkout': 'checkout',
    // The admin area wears its own header, with the tabs, and no footer.
    '/admin': { page: 'admin', header: 'admin-header', footer: false },
    '/admin/inbox': { page: 'inbox', header: 'admin-header', footer: false },
    '/admin/orders': { page: 'orders', header: 'admin-header', footer: false },
    '/admin/products': { page: 'admin-products', header: 'admin-header', footer: false },
    // 'new' for a product that is not there yet.
    '/admin/products/:id': { page: 'admin-product', header: 'admin-header', footer: false },
    '/admin/mail': { page: 'admin-mail', header: 'admin-header', footer: false },
    '/admin/settings': { page: 'admin-settings', header: 'admin-header', footer: false },
  },
  protected: ['/account'], // register protected route here
  // More than a session. Signed out, /admin goes to the login page like any protected route;
  // signed in without `admin`, home, before anything of it renders. What an account may read
  // or change there is still the server's to refuse.
  allow: {
    '/admin': (session) => session.user?.admin === true,
  },
  // Every page has one, since a name the framework made a title of would be English. The
  // admin area's are in the shop's texts too: those are there before any route renders.
  titles: {
    404: t('title.notFound'),
    home: t('title.home'),
    product: t('title.product'), // until the product's own name arrives
    cart: t('title.cart'),
    checkout: t('title.checkout'),
    account: t('title.account'),
    login: t('title.login'),
    register: t('title.register'),
    verify: t('title.verify'),
    forgot: t('title.forgot'),
    reset: t('title.reset'),
    'confirm-email': t('title.confirmEmail'),
    admin: t('title.admin'),
    inbox: t('title.inbox'),
    orders: t('title.orders'),
    'admin-products': t('title.adminProducts'),
    'admin-product': t('title.adminProduct'), // until the product's own name arrives
    'admin-mail': t('title.adminMail'),
    'admin-settings': t('title.adminSettings'),
  },
  stores: { session, cart, theme, chat, i18n }, // register new store here
  // Only partials you render yourself with x-html; header and footer are fetched by the router.
  partials: ['card', 'toast', 'scrolltop', 'chat'],
  // register new page data here, and the component of a partial that has one
  pages: {
    homePage, productPage, loginPage, registerPage, verifyPage,
    forgotPage, resetPage, confirmEmailPage, accountPage, checkoutPage,
    adminPage, inboxPage, ordersPage, adminProductsPage, adminProductPage, adminMailPage, adminSettingsPage,
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
  // arrives titled with the product already (server/pb_hooks/site.pb.js), and the name alone is
  // in og:site_name beside it.
  siteName: document.querySelector('meta[property="og:site_name"]')?.content || t('brand.name'),
  // Defaults in effect — uncomment to change:
  // loginPath: '/login',        // where the guard sends a signed-out visitor
  // homePath: '/',              // fallback for redirects and goBack()
  // pagesDir: '/pages',         // '<page>.html' is looked up here
  // partialsDir: '/partials',   // change partials directory
  // targetId: 'page',           // element the router renders into
  // header: 'header',           // partial above every page, false drops it everywhere
  // footer: 'footer',           // same below; a route can override either one
});
