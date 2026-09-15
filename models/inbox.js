// A conversation as the inbox lists it: who is asking, about what, the last thing said, and
// whether the shop owes an answer. Messages inside one are the chat's, from models/chat.js.

export function toThread(raw) {
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
