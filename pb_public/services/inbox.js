import { pb } from './pb.js';
import { toMessage } from './chat.js';

// The admin area's side of the chat: every conversation, and the shop's replies. A message is
// drawn as the customer's chat draws it, by toMessage in services/chat.js.

const THREAD_OPTIONS = {
  expand: 'user,product',
  fields: 'id,subject,visitor,waiting,preview,last_message,' +
    'expand.user.name,expand.user.email,expand.product.handle,expand.product.title,expand.product.image',
};

const MESSAGE_FIELDS = 'id,author,body,faq,created';

// The newest first. A shop past a couple of hundred conversations wants paging; this one
// does not yet.
const LIMIT = 200;

// No admin check here: the collection rules give an admin every thread and anybody else
// their own, so a page that calls this without the right account gets nothing it should not.
//
// requestKey null here and in fetchMessages: the page reads the list once on arrival and once
// more when the live connection comes up, and the SDK would otherwise cancel the first read
// the moment the second one goes to the same address.
export async function fetchThreads() {
  const result = await pb.collection('threads').getList(1, LIMIT, {
    ...THREAD_OPTIONS,
    sort: '-last_message',
    skipTotal: true,
    requestKey: null,
  });
  return result.items.map(toThread);
}

export function subscribeToThreads(onChange) {
  return pb.collection('threads').subscribe(
    '*',
    (event) => onChange(event.action, toThread(event.record)),
    { ...THREAD_OPTIONS }, // a copy: the SDK rearranges the options it is handed
  );
}

const inThread = (threadId) => pb.filter('thread = {:thread}', { thread: threadId });

export async function fetchMessages(threadId) {
  const records = await pb.collection('messages').getFullList({
    filter: inThread(threadId),
    fields: MESSAGE_FIELDS,
    sort: 'created',
    requestKey: null,
  });
  return records.map(toMessage);
}

export function subscribeToMessages(threadId, onChange) {
  return pb.collection('messages').subscribe(
    '*',
    (event) => onChange(event.action, toMessage(event.record)),
    { filter: inThread(threadId), fields: MESSAGE_FIELDS },
  );
}

export async function sendReply(threadId, text) {
  const answer = await pb.send('/api/shop/inbox/reply', {
    method: 'POST',
    body: { thread: threadId, body: text.trim() },
  });
  return toMessage(answer.message);
}

export async function deleteThread(threadId) {
  await pb.send('/api/shop/inbox/delete', {
    method: 'POST',
    body: { thread: threadId },
  });
}

// Everything no newer than `before`, the newest conversation the page had on screen. Answers
// with how many went.
export async function clearInbox(before) {
  const answer = await pb.send('/api/shop/inbox/clear', {
    method: 'POST',
    body: { before },
  });
  return answer.deleted;
}

export async function markAnswered(threadId) {
  await pb.send('/api/shop/inbox/answered', {
    method: 'POST',
    body: { thread: threadId },
  });
}

// A conversation as the inbox lists it: who is asking, about what, the last thing said, and
// whether the shop owes an answer.
function toThread(raw) {
  const product = raw.expand?.product;
  const user = raw.expand?.user;

  return {
    id: raw.id,
    subject: raw.subject,

    // Null once the product is out of the catalogue; the subject keeps its name.
    product: product ? { handle: product.handle, title: product.title, image: product.image } : null,

    // Null for a guest, until they sign in from the same browser.
    customer: user ? { name: user.name || user.email.split('@')[0], email: user.email } : null,

    visitor: raw.visitor,
    waiting: raw.waiting === true,
    preview: raw.preview ?? '',
    lastMessageAt: raw.last_message ? raw.last_message.replace(' ', 'T') : '',
  };
}
