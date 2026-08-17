import { login, AUTH_KEY, AUTH_TOKEN } from '../services/auth.js';

// A store, not component data: the router's guard reads it from outside Alpine.
export const session = () => ({
  user: Alpine.$persist(null).as(AUTH_KEY),
  token: Alpine.$persist(null).as(AUTH_TOKEN),

  get isAuthenticated() {
    return this.user != null;
  },

  async signIn(email, password) {
    const { user, token } = await login({ email, password });
    this.user = user;
    this.token = token;
  },

  signOut() {
    this.user = null; // removeItem would clear storage but leave stale state in memory
    this.token = null;
  },
});
