import { pb } from './pb.js';
import { toUser } from '../models/user.js';

// All contact with the SDK's auth lives here. The token is the SDK's business —
// it stores it, refreshes it and sends it — so nothing above this file sees one.

export async function login({ email, password }) {
  try {
    const { record } = await pb.collection('users').authWithPassword(email.trim(), password);
    return toUser(record);
  } catch (err) {
    // PocketBase answers a bad identity or password with 400; anything else is a
    // real failure and must not be disguised as wrong credentials.
    if (err.status === 400) {
      throw new Error('Wrong email or password.');
    }
    throw err;
  }
}

export function logout() {
  pb.authStore.clear();
}

// Read synchronously when the store is created: the SDK has already restored the
// session from storage by then, and the router's guard runs before any callback.
// isValid is the expiry check — a restored record with a dead token would show a
// signed-in header and then fail the first request with a 401.
export function currentUser() {
  return pb.authStore.isValid && pb.authStore.record ? toUser(pb.authStore.record) : null;
}

export function onAuthChange(callback) {
  pb.authStore.onChange((token, record) => callback(record ? toUser(record) : null));
}
