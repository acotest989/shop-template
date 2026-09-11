import { storageKey } from '../lib/storage.js';

// The key the script at the top of index.html reads before the first paint.
const KEY = storageKey('theme');

const chosen = () => {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch (err) {
    return false;
  }
};

// Light or dark. index.html has put `dark` on <html> before anything painted — the
// visitor's choice, or the system setting until they make one — and this store takes it
// from there. The class is the whole mechanism: theme.css hangs the dark palette on it.
export const theme = () => ({
  dark: document.documentElement.classList.contains('dark'),

  init() {
    // Until the visitor picks, the system decides, and goes on deciding when it changes.
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
      if (!chosen()) this.apply(event.matches);
    });

    // A choice made in another tab.
    window.addEventListener('storage', (event) => {
      if (event.key === KEY && event.newValue) this.apply(event.newValue === 'dark');
    });
  },

  toggle() {
    this.apply(!this.dark);
    try {
      localStorage.setItem(KEY, this.dark ? 'dark' : 'light');
    } catch (err) {
      // storage blocked: the page has switched, the choice just will not outlive a reload
    }
  },

  apply(dark) {
    this.dark = dark;
    document.documentElement.classList.toggle('dark', dark);
  },
});
