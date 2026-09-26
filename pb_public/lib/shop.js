import { t } from './i18n.js';

// What tells this shop apart from anything else: the name its visitors see, and the prefix its
// keys carry in the browser's storage.

// The shop's name: Application name in PocketBase's settings, the one the mails sign with. The
// server writes it into index.html as og:site_name (pb_hooks/lib/site.js), so it is set in
// one place for the pages, the titles and the mails alike. brand.name in lang/ is what shows
// should the page arrive without it.
export const shopName = document.querySelector('meta[property="og:site_name"]')?.content || t('brand.name');

// Every app served from localhost shares one origin, so an unprefixed 'cart' or 'token' would
// be shared with the next one opened there.
export const storageKey = (name) => `shop_${name}`;
