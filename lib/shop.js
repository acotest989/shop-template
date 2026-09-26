import { t } from './i18n.js';

// The shop's name: Application name in PocketBase's settings, the one the mails sign with. The
// server writes it into index.html as og:site_name (server/pb_hooks/site.pb.js), so it is set in
// one place for the pages, the titles and the mails alike. brand.name in lang/ is what shows
// should the page arrive without it.
export const shopName = document.querySelector('meta[property="og:site_name"]')?.content || t('brand.name');
