import { createApp } from 'alpineshell';

import { app } from './app.js';
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
  },
  protected: ['/account'], // register protected route here
  // More than a session. Signed out, /admin goes to the login page like any protected route;
  // signed in without `admin`, home, before anything of it renders. What an account may read
  // or change there is still the server's to refuse.
  allow: {
    '/admin': (session) => session.user?.admin === true,
  },
  // Overrides only — a page with no entry gets its own name as the title.
  titles: {
    404: 'Page not found',
    home: 'Products',
    login: 'Sign in',
    register: 'Create an account',
    verify: 'Verify your email',
    forgot: 'Reset your password',
    reset: 'Set a new password',
    'confirm-email': 'Confirm your new email',
    admin: 'Admin',
    'admin-products': 'All products',
    'admin-product': 'Product', // until the product's own name arrives
    'admin-mail': 'Mail',
  },
  stores: { session, cart, theme, chat }, // register new store here
  // Only partials you render yourself with x-html; header and footer are fetched by the router.
  partials: ['card', 'toast', 'scrolltop', 'chat'],
  // register new page data here, and the component of a partial that has one
  pages: {
    homePage, productPage, loginPage, registerPage, verifyPage,
    forgotPage, resetPage, confirmEmailPage, accountPage, checkoutPage,
    adminPage, inboxPage, ordersPage, adminProductsPage, adminProductPage, adminMailPage,
    chatWidget,
  },
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
