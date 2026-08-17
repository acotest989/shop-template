import { pb } from './pb.js';
import { toUser } from '../models/user.js';
import { storageKey } from '../lib/storage.js';

export const AUTH_KEY = storageKey('auth');
export const AUTH_TOKEN = storageKey('auth_token');

export async function login({ email, password }) {
  try {
    const { token, record } = await pb.post('/api/collections/users/auth-with-password', {
      identity: email.trim(),
      password,
    });
    return { user: toUser(record), token };
  } catch (err) {
    if (err.status === 400) {
      throw new Error('Wrong email or password.');
    }
    throw err;
  }
}
