import { pb } from './pb.js';

// The shop's settings, from the one record of `shop_settings` by way of
// pb_hooks/lib/settings.js, which hands out only what an admin may change at /admin/settings.

export async function fetchSettings() {
  return toSettings(await pb.send('/api/shop/admin/settings', { method: 'GET' }));
}

// Any of { language, accent, notices }. Answers with every setting as saved.
export async function saveSettings(changes) {
  return toSettings(await pb.send('/api/shop/admin/settings', { method: 'POST', body: toSettingsBody(changes) }));
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
function toSettings(raw) {
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
function toSettingsBody({ language, accent, notices }) {
  const body = {};
  if (language !== undefined) body.language = language;
  if (accent !== undefined) body.accent = accent;
  if (notices) {
    body.notices = Object.fromEntries(Object.entries(notices).map(([ours, on]) => [NOTICES[ours], on]));
  }
  return body;
}
