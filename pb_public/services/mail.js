import { pb } from './pb.js';

// The mails the shop sends, as /admin/mail shows them: the templates in pb_hooks/mail/, filled
// by pb_hooks/lib/mail.js with the samples in their mails.json.

// Every mail there is, in the order the page lists them.
export async function fetchMails() {
  const mails = await pb.send('/api/shop/admin/mail', { method: 'GET' });
  return mails.map(toMail);
}

// One mail as it would go out, filled with its sample. The server reads the template from disk
// each time, so asking again after an edit shows the edit.
export async function fetchMailPreview(name) {
  return toMailPreview(await pb.send(`/api/shop/admin/mail/${encodeURIComponent(name)}`, { method: 'GET' }));
}

// That mail, filled with its sample, sent to the signed-in admin's own address with [Test] in
// front of its subject. Answers with the address it went to.
export async function sendTestMail(name) {
  const answer = await pb.send(`/api/shop/admin/mail/${encodeURIComponent(name)}/test`, { method: 'POST' });
  return answer.to;
}

// One mail as the list shows it: what it is, who gets it, and when.
function toMail(raw) {
  return {
    name: raw.name,
    title: raw.title,
    to: raw.to,
    when: raw.when,
  };
}

// That mail filled with its sample: the subject, the whole message as HTML and as plain text,
// and the file it came from.
function toMailPreview(raw) {
  return {
    name: raw.name,
    subject: raw.subject,
    html: raw.html,
    text: raw.text ?? '',
    file: raw.file,
  };
}
