/// <reference path="../../pb_data/types.d.ts" />

// What the shop does with its mails beyond sending them, all from pb_hooks/mail/ and lib/mailer.js:
//
// - PocketBase's own account mails. PocketBase makes each message from the templates on the
//   users collection, and these put ours in its place before it goes, so those templates in the
//   dashboard no longer decide what a customer gets. A template that fails leaves PocketBase's
//   message to go out as it was, and a token missing from the event does too: a link that goes
//   nowhere is worse than a plain mail.
// - What /admin/mail reads: every mail, each one filled with its sample, and the one way it sends
//   anything, a test to the admin asking for it.
//
// The events and routes that call these are in pb_hooks/shop.pb.js.

const appURL = () => $app.settings().meta.appURL;

// onMailerRecordVerificationSend
function verification(e) {
  const token = e.meta && e.meta.token;
  if (token) {
    const mailer = require(__hooks + '/lib/mailer.js');
    mailer.replace(e, 'verify-email', {
      link: appURL() + '/verify/' + token,
      validFor: mailer.validFor(e.record, 'verificationToken'),
    });
  }
  e.next();
}

// onMailerRecordPasswordResetSend
function passwordReset(e) {
  const token = e.meta && e.meta.token;
  if (token) {
    const mailer = require(__hooks + '/lib/mailer.js');
    mailer.replace(e, 'reset-password', {
      link: appURL() + '/reset-password/' + token,
      validFor: mailer.validFor(e.record, 'passwordResetToken'),
    });
  }
  e.next();
}

// onMailerRecordEmailChangeSend
function emailChange(e) {
  const token = e.meta && e.meta.token;
  if (token) {
    const mailer = require(__hooks + '/lib/mailer.js');
    mailer.replace(e, 'confirm-email-change', {
      link: appURL() + '/confirm-email/' + token,
      newEmail: e.meta.newEmail || '',
      validFor: mailer.validFor(e.record, 'emailChangeToken'),
    });
  }
  e.next();
}

// onMailerRecordAuthAlertSend
function authAlert(e) {
  // Where the sign-in came from, in PocketBase's words. Should the event not carry it, its own
  // message still does, in the <em> its template puts it in.
  let info = e.meta && e.meta.info;
  if (!info) {
    const found = String(e.message.html).match(/<em>([\s\S]*?)<\/em>/);
    info = found ? found[1] : '';
  }
  require(__hooks + '/lib/mailer.js').replace(e, 'login-alert', { info: info });
  e.next();
}

// GET /api/shop/admin/mail — every mail in mails.json, in its order: what it is, who gets it and
// when, in the shop's language.
function list(e) {
  const catalogue = require(__hooks + '/lib/mailer.js').catalogue();
  const mails = [];
  for (const name in catalogue) {
    mails.push({ name: name, title: catalogue[name].title, to: catalogue[name].to, when: catalogue[name].when });
  }

  return e.json(200, mails);
}

// The mail a route names, filled with its sample, or the refusal saying why it cannot be. A
// template being edited can be half written, so what is wrong with it is said.
const filled = (e, lang) => {
  let mail;
  try {
    mail = require(__hooks + '/lib/mailer.js').preview(e.request.pathValue('name'));
  } catch (err) {
    throw new BadRequestError(lang.t('mail.cannotFill', { error: err && err.message ? err.message : String(err) }));
  }
  if (!mail) {
    throw new NotFoundError(lang.t('mail.noSuchMail'));
  }
  return mail;
};

// GET /api/shop/admin/mail/{name} — one mail as it would go out, read from disk on every request,
// so the preview shows a template the moment it is saved.
function preview(e) {
  const mail = filled(e, require(__hooks + '/lib/lang.js').open());

  return e.json(200, {
    name: e.request.pathValue('name'),
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    file: mail.file,
  });
}

// POST /api/shop/admin/mail/{name}/test — the same mail, sent: to the admin's own address alone,
// and marked as a test in its subject, so it can be read where the customers read theirs.
// Nothing else goes anywhere from here.
function test(e) {
  const lang = require(__hooks + '/lib/lang.js').open();
  const mail = filled(e, lang);
  const to = e.auth.email();

  try {
    require(__hooks + '/lib/mailer.js').deliver({ subject: '[Test] ' + mail.subject, html: mail.html, text: mail.text }, [{ address: to }]);
  } catch (err) {
    $app.logger().error('test mail failed', 'mail', e.request.pathValue('name'), 'error', String(err));
    throw new BadRequestError(lang.t('mail.notSent'));
  }

  return e.json(200, { to: to });
}

module.exports = { verification, passwordReset, emailChange, authAlert, list, preview, test };
