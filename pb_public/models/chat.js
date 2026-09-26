// What the chat sends and reads.
//
// Going out, a question is one of two things: a pick from the list, named by its id, or
// text the visitor wrote. Never both, and the hook refuses a request that tries.

export function toQuestion({ visitor, product, faq, text }) {
  return faq
    ? { visitor, product, faq }
    : { visitor, product, body: text.trim() };
}

// The list is read for its words and nothing else: position already sorted it, and
// whether it is active is the collection rule's business.
export function toFaq(raw) {
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

    // The date and the time with a T between them, as in the order model.
    sentAt: raw.created ? raw.created.replace(' ', 'T') : '',
  };
}
