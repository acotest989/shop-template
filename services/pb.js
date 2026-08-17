import PocketBase, { LocalAuthStore } from 'pocketbase';
import { storageKey } from '../lib/storage.js';

// The only place that constructs the client. Nothing else imports the SDK, so
// swapping the backend stays a one-file job.
// The auth store is namespaced like every other key: the SDK would otherwise use
// a bare 'pocketbase_auth', shared with the next app served from localhost.
export const pb = new PocketBase(
  'http://127.0.0.1:8090',
  new LocalAuthStore(storageKey('pb_auth')),
);
