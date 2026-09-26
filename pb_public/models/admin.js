// A product as the overview's stock list draws it: what it is, where it lives, how many are left.
export function toStockItem(raw) {
  return {
    id: raw.id,
    handle: raw.handle,
    title: raw.title,
    image: raw.image,
    stock: raw.stock ?? 0,
  };
}

// A product as the admin area edits it: every field there is to change, in the app's names,
// and the two nobody edits by hand — how many sold, and the currency — to show beside them.
export function toAdminProduct(raw) {
  return {
    id: raw.id,
    handle: raw.handle,
    title: raw.title,
    brand: raw.brand ?? '',
    category: raw.category,
    description: raw.description ?? '',
    price: raw.price_cents,
    regularPrice: raw.regular_price_cents || 0, // 0 for no struck-through price
    currency: raw.currency,
    stock: raw.stock ?? 0,
    sold: raw.sold ?? 0,
    weight: raw.weight ?? 0,
    image: raw.image ?? '',
    images: raw.images ?? [],
    tags: raw.tags ?? [],
    hidden: raw.hidden === true,
  };
}

// Going out to pb_hooks/products.pb.js. `stockWas` is the stock the form opened with:
// the hook writes a changed stock only over that number, so a sale made meanwhile is not undone.
export function toProductBody(product, { stockWas } = {}) {
  return {
    id: product.id ?? '',
    title: product.title,
    brand: product.brand,
    category: product.category,
    description: product.description,
    price: product.price,
    regularPrice: product.regularPrice || 0,
    stock: product.stock,
    stockWas,
    weight: product.weight,
    image: product.image,
    images: product.images,
    tags: product.tags,
    hidden: product.hidden,
  };
}

// One of the mails the shop sends, as /admin/mail lists it: pb_hooks/mail/mails.json.
export function toMail(raw) {
  return {
    name: raw.name,
    title: raw.title,
    to: raw.to,
    when: raw.when,
  };
}

// That mail filled with its sample: the subject, the whole message, and the file it came from.
export function toMailPreview(raw) {
  return {
    name: raw.name,
    subject: raw.subject,
    html: raw.html,
    text: raw.text ?? '',
    file: raw.file,
  };
}

// The owner's notices, in the app's names and the record's.
const NOTICES = {
  mailQuestions: 'mail_questions',
  mailOrders: 'mail_orders',
  telegramQuestions: 'telegram_questions',
  telegramOrders: 'telegram_orders',
};

// The settings an admin can change, and the choices there are: languages as codes (en,
// sr-Latn), accents as the names assets/theme.css knows. Whether Telegram can send at all is
// all the page learns of the bot: its token stays on the server.
export function toSettings(raw) {
  return {
    language: raw.language,
    languages: raw.languages ?? [],
    accent: raw.accent ?? 'none',
    accents: raw.accents ?? [],
    notices: Object.fromEntries(
      Object.entries(NOTICES).map(([ours, theirs]) => [ours, raw.notices?.[theirs] ?? true]),
    ),
    telegramReady: raw.telegram === true,
  };
}

// Only what is being changed; the server keeps the rest as it is.
export function toSettingsBody({ language, accent, notices }) {
  const body = {};
  if (language !== undefined) body.language = language;
  if (accent !== undefined) body.accent = accent;
  if (notices) {
    body.notices = Object.fromEntries(Object.entries(notices).map(([ours, on]) => [NOTICES[ours], on]));
  }
  return body;
}

// Which field of the form a server's complaint belongs to. The hook answers in the form's own
// names, and PocketBase, when its own checks catch something first, in the record's.
const FORM_FIELDS = [
  'title', 'brand', 'category', 'description', 'price', 'regularPrice',
  'stock', 'weight', 'image', 'images', 'tags', 'hidden',
];
const RECORD_FIELDS = { price_cents: 'price', regular_price_cents: 'regularPrice' };

export function productField(name) {
  return RECORD_FIELDS[name] ?? (FORM_FIELDS.includes(name) ? name : null);
}
