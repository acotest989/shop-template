import { login, AUTH_KEY } from '../services/auth.js';

// A store, not component data: the router's guard reads it from outside Alpine.
export const session = () => ({
  user: Alpine.$persist(null).as(AUTH_KEY),

  get isAuthenticated() {
    return this.user != null;
  },

  async signIn(email, password) {
    this.user = await login({ email, password });
  },

  signOut() {
    this.user = null; // removeItem would clear storage but leave stale state in memory
  },
});
