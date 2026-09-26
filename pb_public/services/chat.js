import { pb } from './pb.js';

// The chat on a product page, as a customer or a guest has it. The shop's side of the same
// conversations is services/inbox.js, which draws their messages with toMessage from here.

const MESSAGE_FIELDS = 'id,author,body,faq,created';

export async function fetchFaqs() {
  const records = await pb.collection('faqs').getFullList({
    fields: 'id,question,answer',
    sort: 'position',
  });
  return records.map(toFaq);
}

// The chat collections refuse every write, so a question goes to the hook's route. What
// comes back is the message as stored, and how many questions a guest has left; a signed-in
// customer's count is null.
export async function sendQuestion(question) {
  const answer = await pb.send('/api/shop/chat', {
    method: 'POST',
    body: toQuestion(question),
  });
  return {
    left: answer.left ?? null,
    message: answer.message ? toMessage(answer.message) : null,
  };
}

// The signed-in customer's own conversation, named in the filter rather than left to the
// rules: those also let an admin read everyone's, and an admin asking about a product on its
// page is a customer like any other.
const aboutProduct = (productId) =>
  pb.filter('thread.user = {:user} && thread.product = {:product}', {
    user: pb.authStore.record?.id ?? '',
    product: productId,
  });

// requestKey null: the chat reads the conversation once on opening and once more when the live
// connection comes up, and the SDK would otherwise cancel the first read for the second.
export async function fetchConversation(productId) {
  const records = await pb.collection('messages').getFullList({
    filter: aboutProduct(productId),
    fields: MESSAGE_FIELDS,
    sort: 'created',
    requestKey: null,
  });
  return records.map(toMessage);
}

// Every change to a message in the conversation, as it happens, until the returned function
// is called. Realtime checks the same rules as a list, so nobody else's messages arrive.
export function subscribeToConversation(productId, onChange) {
  return pb.collection('messages').subscribe(
    '*',
    (event) => onChange(event.action, toMessage(event.record)),
    { filter: aboutProduct(productId), fields: MESSAGE_FIELDS },
  );
}

// The shop's latest reply about this product is on the customer's screen.
export async function markSeen(productId) {
  await pb.send('/api/shop/chat/seen', {
    method: 'POST',
    body: { product: productId },
  });
}

export async function claimConversations(visitor) {
  await pb.send('/api/shop/chat/claim', {
    method: 'POST',
    body: { visitor },
  });
}

// --- What the chat sends and reads ---

// Going out, a question is one of two things: a pick from the list, named by its id, or
// text the visitor wrote. Never both, and the hook refuses a request that tries.
function toQuestion({ visitor, product, faq, text }) {
  return faq
    ? { visitor, product, faq }
    : { visitor, product, body: text.trim() };
}

// The list is read for its words and nothing else: position already sorted it, and
// whether it is active is the collection rule's business.
function toFaq(raw) {
  return {
    id: raw.id,
    question: raw.question,
    answer: raw.answer,
  };
}

// A message as the chat draws it: who said it, and what. The thread stays behind, since a
// product page shows one conversation and never needs to know how it is stored.
export function toMessage(raw) {
  return {
    id: raw.id,
    from: raw.author, // 'visitor' or 'shop'
    text: raw.body,
    faq: raw.faq || '',

    // The date and the time with a T between them, as in services/orders.js.
    sentAt: raw.created ? raw.created.replace(' ', 'T') : '',
  };
}
