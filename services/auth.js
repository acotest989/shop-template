import { pb } from './pb.js';
import { fieldError } from 'alpineshell';
import { toUser } from '../models/user.js';

// All contact with the SDK's auth lives here. The token is the SDK's business —
// it stores it, refreshes it and sends it — so nothing above this file sees one.

// The rate limiter answers 429, and its own wording is not something to hand a
// visitor. Every entry point here can hit it, so the translation lives in one place.
const TOO_MANY = 'Too many attempts. Please wait a minute and try again.';

export async function login({ email, password }) {
  try {
    const { record } = await pb.collection('users').authWithPassword(email.trim(), password);
    return toUser(record);
  } catch (err) {
    if (err.status === 429) throw new Error(TOO_MANY);

    // PocketBase answers a bad identity or password with 400; anything else is a
    // real failure and must not be disguised as wrong credentials.
    if (err.status === 400) {
      throw new Error('Wrong email or password.');
    }
    throw err;
  }
}

// Only the ones a visitor can actually trigger. Keyed by code rather than by the
// server's wording, which changes between releases and would take this with it.
// Anything unlisted keeps PocketBase's own text: terse, but still specific.
const SAID_BETTER = {
  validation_not_unique: 'That address already has an account.',
  validation_invalid_email: 'That does not look like an email address.',
  validation_length_out_of_range: 'Too short — use at least 8 characters.',
};

// PocketBase reports validation per field. Flattening it here — and rethrowing with
// a plain { field: message } — means a page never learns the shape of somebody
// else's error response.
function rethrow(err) {
  if (err.status === 429) throw new Error(TOO_MANY);

  const fields = err.data?.data;
  if (!fields || Object.keys(fields).length === 0) throw err;

  throw fieldError(
    Object.fromEntries(
      Object.entries(fields).map(([field, detail]) => [
        field,
        SAID_BETTER[detail.code] ?? detail.message,
      ]),
    ),
  );
}

// create() does not sign anybody in, so the three steps are deliberate: make the
// account, send the verification link, then start the session.
export async function register({ name, email, password }) {
  const identity = email.trim();

  try {
    await pb.collection('users').create({ name: name.trim(), email: identity, password, passwordConfirm: password });
  } catch (err) {
    rethrow(err);
  }

  // A mail failure must not read as a failed signup: the account exists either way,
  // and a retry would come back as "email already in use".
  await pb.collection('users').requestVerification(identity).catch(console.error);

  return login({ email: identity, password });
}

export function requestVerification(email) {
  return pb.collection('users').requestVerification(email.trim());
}

export async function confirmVerification(token) {
  try {
    await pb.collection('users').confirmVerification(token);
  } catch (err) {
    if (err.status === 400) throw new Error('This link has expired or has already been used.');
    throw err;
  }

  // The stored record still says verified: false — refresh it so the UI agrees.
  if (pb.authStore.isValid) await pb.collection('users').authRefresh().catch(console.error);
}

// Never reports whether the address exists: that answer alone would tell a stranger
// who has an account here. Being rate limited is not that answer — it is about us,
// not about them — so it is the one failure worth showing.
export async function requestPasswordReset(email) {
  try {
    await pb.collection('users').requestPasswordReset(email.trim());
  } catch (err) {
    if (err.status === 429) throw new Error(TOO_MANY);
    console.error(err);
  }
}

export async function confirmPasswordReset(token, password) {
  try {
    await pb.collection('users').confirmPasswordReset(token, password, password);
  } catch (err) {
    if (err.status === 400 && !err.data?.data?.password) {
      throw new Error('This link has expired or has already been used.');
    }
    rethrow(err);
  }

  // Changing a password invalidates every token the account had, this one included.
  pb.authStore.clear();
}

export function logout() {
  pb.authStore.clear();
}

// The SDK keeps its own copy of the record in sync when the authenticated one is
// updated, so the session store's mirror follows without being told.
export async function updateName(name) {
  try {
    const record = await pb.collection('users').update(pb.authStore.record.id, { name: name.trim() });
    return toUser(record);
  } catch (err) {
    rethrow(err);
  }
}

// oldPassword is what stops a stolen token from taking the account over.
export async function changePassword({ oldPassword, password }) {
  try {
    await pb.collection('users').update(pb.authStore.record.id, {
      oldPassword,
      password,
      passwordConfirm: password,
    });
  } catch (err) {
    rethrow(err);
  }

  pb.authStore.clear(); // every token of this account is invalid now, ours included
}

// The address does not change here: PocketBase mails a link to the new one first,
// which is what proves the person asking can read that inbox.
export async function requestEmailChange(email) {
  try {
    await pb.collection('users').requestEmailChange(email.trim());
  } catch (err) {
    rethrow(err);
  }
}

export async function confirmEmailChange(token, password) {
  try {
    await pb.collection('users').confirmEmailChange(token, password);
  } catch (err) {
    if (err.status === 400 && !err.data?.data?.password) {
      throw new Error('This link has expired or has already been used.');
    }
    rethrow(err);
  }

  pb.authStore.clear();
}

export async function deleteAccount() {
  await pb.collection('users').delete(pb.authStore.record.id);
  pb.authStore.clear();
}

export function isVerified() {
  return pb.authStore.record?.verified === true;
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
