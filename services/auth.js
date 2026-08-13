import { sleep } from './mock.js';

const DEMO_USER = {
  email: 'demo@shop.test',
  password: 'test1234',
  name: 'Demo User',
};

export const AUTH_KEY = 'auth';

export async function login({ email, password }) {
  await sleep();

  const ok = email.trim().toLowerCase() === DEMO_USER.email && password === DEMO_USER.password;
  if (!ok) throw new Error('Wrong email or password.');

  return { email: DEMO_USER.email, name: DEMO_USER.name, token: 'mock-token' };
}
