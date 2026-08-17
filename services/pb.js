import { http } from 'alpineshell';

export const pb = http.create({ baseURL: 'http://127.0.0.1:8090' });

export function authHeader() {
  const token = Alpine.store('session')?.token;
  return token ? { Authorization: token } : {};
}