import { login, logout, currentUser, onAuthChange } from '../services/auth.js';

// A mirror, not a second copy: the SDK owns the session and persists it, this store
// only makes it reactive for the UI and readable by the guard from outside Alpine.
export const session = () => ({
  user: currentUser(),

  init() {
    onAuthChange((user) => (this.user = user)); // a token expiring, or another tab signing out
  },

  get isAuthenticated() {
    return this.user != null;
  },

  async signIn(email, password) {
    this.user = await login({ email, password });
  },

  signOut() {
    logout(); // onAuthChange clears this.user
  },
});
