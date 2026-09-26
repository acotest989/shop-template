/// <reference path="../../pb_data/types.d.ts" />

// The admin area's API is everything under /api/shop/admin/, and this is the one door to it: an
// account with `admin` ticked, which only the dashboard can tick. One check in front of every
// route there, rather than one in each, so a route added later cannot forget it. A superuser
// signed in to the dashboard is not an admin of the shop: its session is not a customer's.
function admin(e) {
  if (!e.request.url.path.startsWith('/api/shop/admin/')) return e.next();

  const auth = e.auth;
  if (!auth || auth.collection().name !== 'users' || !auth.getBool('admin')) {
    const message = require(__hooks + '/lib/lang.js').open().t('admin.only');
    throw auth ? new ForbiddenError(message) : new UnauthorizedError(message);
  }

  return e.next();
}

module.exports = { admin };
