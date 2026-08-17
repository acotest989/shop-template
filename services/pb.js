import PocketBase, { LocalAuthStore } from 'pocketbase';
import { storageKey } from '../lib/storage.js';

// The only file that imports the SDK, so swapping the backend stays a one-file job.
// '/' because PocketBase serves this app itself — no host to hardcode, no CORS.
// The auth store is namespaced like every other key; the SDK would use a bare
// 'pocketbase_auth', shared with the next app served from the same origin.
export const pb = new PocketBase('/', new LocalAuthStore(storageKey('pb_auth')));
