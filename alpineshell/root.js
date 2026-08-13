import { http, errorMessage } from './http.js';
import { router } from './router.js';

// Partials are markup shared across routes; pages own their own file.
async function loadPartials(names, dir) {
  const pairs = await Promise.all(
    names.map(async (name) => [name, await http.get(`${dir}/${name}.html`)])
  );
  return Object.fromEntries(pairs);
}

// The root component every page is nested in: navigation, shared markup, app-wide errors.
// `extend` is merged in, so the app can add its own state and methods.
export function createRoot({ partials = [], partialsDir = '/partials', extend = {}, debug = false }) {
  return () => ({
    ...router,
    ...extend,

    errMsg: '',
    // seeded so x-html renders "" instead of "undefined" before the fetch lands
    partials: Object.fromEntries(partials.map((name) => [name, ''])),

    async init() {
      this.initRouter();
      this.watchRouter();

      try {
        this.partials = await loadPartials(partials, partialsDir);
      } catch (err) {
        console.error(err);
        this.errMsg = errorMessage(err, 'Error while loading.');
      }

      await extend.init?.call(this);
      if (debug) console.log('App is ready.');
    },
  });
}
