import { storageKey } from '../lib/storage.js';
import { fetchFaqs, sendQuestion } from '../services/chat.js';

// GUEST_QUESTIONS and MAX_LENGTH in server/pb_hooks/chat.pb.js. The hook's are the ones
// that count; these only keep the chat from offering what it would refuse.
const GUEST_QUESTIONS = 3;
const MAX_LENGTH = 500;

export const chat = () => ({
  // Who this browser is to the shop, kept for good: the shop sees the same visitor come back
  // the next day. `left` belongs to the id, so a new id starts at three, as the hook does.
  visitor: Alpine.$persist({ id: '', left: GUEST_QUESTIONS }).as(storageKey('visitor')),

  // What this tab has asked and been told, per product, and only for as long as the tab is
  // open. The server never sends a guest's conversation back, so this is all of it they see.
  transcript: Alpine.$persist({ visitor: '', products: {} }).as(storageKey('chat')).using(sessionStorage),

  faqs: [],
  faqsLoaded: false,

  guestQuestions: GUEST_QUESTIONS,
  maxLength: MAX_LENGTH,

  // The shop's clock. A reply waits on the transcript with the moment it is due, and shows once
  // this reaches it. A reload shows whatever fell due in the meantime.
  now: Date.now(),

  init() {
    if (!this.visitor.id) {
      this.visitor = { id: crypto.randomUUID(), left: GUEST_QUESTIONS };
    }

    // A transcript written under another id is somebody else's, as far as this browser can
    // tell: the id was cleared or replaced since, and the conversation goes with it.
    if (this.transcript.visitor !== this.visitor.id) {
      this.transcript = { visitor: this.visitor.id, products: {} };
    }

    // Reloaded in the middle of a reply: the line is still on the transcript, its timer is not.
    for (const lines of Object.values(this.transcript.products)) {
      for (const line of lines) {
        if (line.at > this.now) this.wake(line.at);
      }
    }
  },

  // What is on screen: everything but a reply that is not due yet.
  lines(productId) {
    return this.all(productId).filter((line) => !(line.at > this.now));
  },

  typing(productId) {
    return this.all(productId).some((line) => line.at > this.now);
  },

  all(productId) {
    return this.transcript.products[productId] ?? [];
  },

  // Once per visit to the site, whichever product opens the chat first.
  async loadFaqs() {
    if (this.faqsLoaded) return;
    this.faqs = await fetchFaqs();
    this.faqsLoaded = true;
  },

  // Picked from the list: the answer is already here, and the shop learns what was asked on the
  // way. A pick that fails to arrive costs the visitor nothing.
  pick(product, faq) {
    this.say(product.id, { from: 'visitor', text: faq.question, faq: faq.id });
    this.reply(product.id, faq.answer);

    sendQuestion({ visitor: this.visitor.id, product: product.id, faq: faq.id })
      .then(({ left }) => this.count(left))
      .catch((err) => console.error(err));
  },

  // Written by the visitor: it goes on the transcript only once the shop has it, so a
  // question that failed to send is still in the box to try again.
  async ask(product, text) {
    try {
      const { left } = await sendQuestion({ visitor: this.visitor.id, product: product.id, text });
      this.count(left);
    } catch (err) {
      if (err.status === 403) this.visitor.left = 0; // the hook counted what this browser forgot
      throw err;
    }

    this.say(product.id, { from: 'visitor', text: text.trim() });
    this.reply(product.id, 'Thanks, we have your question.');
  },

  say(productId, line) {
    this.transcript.products[productId] = [...this.all(productId), line];
  },

  // The shop's automatic lines take a moment, as a person's would: longer for a longer answer,
  // never quite the same twice, and never past a couple of seconds.
  reply(productId, text) {
    const delay = Math.min(700 + text.length * 6, 2000) + Math.random() * 300;
    const at = Date.now() + delay;

    this.say(productId, { from: 'shop', text, at });
    this.wake(at);
  },

  wake(at) {
    setTimeout(() => (this.now = Math.max(Date.now(), at)), at - Date.now());
  },

  count(left) {
    if (left !== null) this.visitor.left = left;
  },
});
