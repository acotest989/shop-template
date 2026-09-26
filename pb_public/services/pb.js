import PocketBase, { LocalAuthStore } from 'pocketbase';
import { storageKey } from '../lib/shop.js';
import { t } from '../lib/i18n.js';

// The only file that imports the SDK, so swapping the backend stays a one-file job.
// '/' because PocketBase serves this app itself — no host to hardcode, no CORS.
// The auth store is namespaced like every other key; the SDK would use a bare
// 'pocketbase_auth', shared with the next app served from the same origin.
export const pb = new PocketBase('/', new LocalAuthStore(storageKey('pb_auth')));

// What PocketBase says for itself — no connection, a rate limit, a crash — is English whatever
// the shop speaks, and not written for a visitor either. The hooks' own sentences are already in
// the shop's language (pb_hooks/lang/), and pass through untouched. Every request the SDK makes
// goes through send(), so this is the one place to say it better.
const send = pb.send.bind(pb);
pb.send = async (path, options) => {
  try {
    return await send(path, options);
  } catch (err) {
    if (err.isAbort) throw err; // cancelled on purpose; nobody is shown it
    if (err.status === 0) err.message = t('common.offline');
    else if (err.status === 429) err.message = t('common.tooMany');
    else if (err.status >= 500) err.message = t('common.serverError');
    throw err;
  }
};
