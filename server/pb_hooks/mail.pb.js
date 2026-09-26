/// <reference path="../pb_data/types.d.ts" />

// PocketBase's own account mails, from server/mail/ like every other mail the shop sends:
// PocketBase makes each message from the templates on the users collection, and these hooks put
// ours in its place before it goes. Those templates in the dashboard no longer decide what a
// customer gets. A template that fails leaves PocketBase's message to go out as it was, and a
// token missing from the event does too: a link that goes nowhere is worse than a plain mail.
//
// Below them, what /admin/mail reads: every mail, and each one filled with its sample, and
// the one way it sends anything: a test, to the admin asking for it.

onMailerRecordVerificationSend((e) => {
  const token = e.meta && e.meta.token;
  if (token) {
    const mailer = require(__hooks + '/mailer.js');
    mailer.replace(e, 'verify-email', {
      link: $app.settings().meta.appURL + '/verify/' + token,
      validFor: mailer.validFor(e.record, 'verificationToken'),
    });
  }
  e.next();
}, 'users');

onMailerRecordPasswordResetSend((e) => {
  const token = e.meta && e.meta.token;
  if (token) {
    const mailer = require(__hooks + '/mailer.js');
    mailer.replace(e, 'reset-password', {
      link: $app.settings().meta.appURL + '/reset-password/' + token,
      validFor: mailer.validFor(e.record, 'passwordResetToken'),
    });
  }
  e.next();
}, 'users');

onMailerRecordEmailChangeSend((e) => {
  const token = e.meta && e.meta.token;
  if (token) {
    const mailer = require(__hooks + '/mailer.js');
    mailer.replace(e, 'confirm-email-change', {
      link: $app.settings().meta.appURL + '/confirm-email/' + token,
      newEmail: e.meta.newEmail || '',
      validFor: mailer.validFor(e.record, 'emailChangeToken'),
    });
  }
  e.next();
}, 'users');

onMailerRecordAuthAlertSend((e) => {
  // Where the sign-in came from, in PocketBase's words. Should the event not carry it, its own
  // message still does, in the <em> its template puts it in.
  let info = e.meta && e.meta.info;
  if (!info) {
    const found = String(e.message.html).match(/<em>([\s\S]*?)<\/em>/);
    info = found ? found[1] : '';
  }
  require(__hooks + '/mailer.js').replace(e, 'login-alert', { info: info });
  e.next();
}, 'users');

// Every mail in mails.json, in its order: what it is, who gets it and when, in the shop's language.
routerAdd('GET', '/api/shop/admin/mail', (e) => {
  if (!e.auth.getBool('admin')) {
    throw new ForbiddenError(require(__hooks + '/lang.js').open().t('mail.onlyShopSee'));
  }

  const catalogue = require(__hooks + '/mailer.js').catalogue();
  const mails = [];
  for (const name in catalogue) {
    mails.push({ name: name, title: catalogue[name].title, to: catalogue[name].to, when: catalogue[name].when });
  }

  return e.json(200, mails);
}, $apis.requireAuth('users'));

// One mail as it would go out, filled with its sample: read from disk on every request, so the
// preview shows a template the moment it is saved.
routerAdd('GET', '/api/shop/admin/mail/{name}', (e) => {
  const lang = require(__hooks + '/lang.js').open();

  if (!e.auth.getBool('admin')) {
    throw new ForbiddenError(lang.t('mail.onlyShopSee'));
  }

  const name = e.request.pathValue('name');

  let mail;
  try {
    mail = require(__hooks + '/mailer.js').preview(name);
  } catch (err) {
    // A template being edited can be half written; say what is wrong with it.
    throw new BadRequestError(lang.t('mail.cannotFill', { error: err && err.message ? err.message : String(err) }));
  }
  if (!mail) {
    throw new NotFoundError(lang.t('mail.noSuchMail'));
  }

  return e.json(200, { name: name, subject: mail.subject, html: mail.html, text: mail.text, file: mail.file });
}, $apis.requireAuth('users'));

// The same mail, sent: to the admin's own address alone, filled with its sample, and marked as
// a test in its subject, so it can be read where the customers read theirs. Nothing else goes
// anywhere from here.
routerAdd('POST', '/api/shop/admin/mail/{name}/test', (e) => {
  const lang = require(__hooks + '/lang.js').open();

  if (!e.auth.getBool('admin')) {
    throw new ForbiddenError(lang.t('mail.onlyShopTest'));
  }

  const mailer = require(__hooks + '/mailer.js');
  const name = e.request.pathValue('name');

  let mail;
  try {
    mail = mailer.preview(name);
  } catch (err) {
    throw new BadRequestError(lang.t('mail.cannotFill', { error: err && err.message ? err.message : String(err) }));
  }
  if (!mail) {
    throw new NotFoundError(lang.t('mail.noSuchMail'));
  }

  const to = e.auth.email();

  try {
    mailer.deliver({ subject: '[Test] ' + mail.subject, html: mail.html }, [{ address: to }]);
  } catch (err) {
    $app.logger().error('test mail failed', 'mail', name, 'error', String(err));
    throw new BadRequestError(lang.t('mail.notSent'));
  }

  return e.json(200, { to: to });
}, $apis.requireAuth('users'));
