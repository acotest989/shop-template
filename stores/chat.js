import { storageKey } from '../lib/storage.js';
import { t } from '../lib/i18n.js';
import { currentUser, onAuthChange } from '../services/auth.js';
import {
  fetchFaqs,
  sendQuestion,
  fetchConversation,
  subscribeToConversation,
  claimConversations,
  markSeen,
} from '../services/chat.js';

// GUEST_QUESTIONS and MAX_LENGTH in server/pb_hooks/chat.pb.js. The hook's are the ones
// that count; these only keep the chat from offering what it would refuse.
const GUEST_QUESTIONS = 3;
const MAX_LENGTH = 500;

// Two sources, one chat. A guest's conversation is what this tab has seen, kept in
// sessionStorage; a customer's is the server's, read when the panel opens and followed as it
// changes. Either way a product page asks for lines, and gets the same shape back.
export const chat = () => ({
  // Who this browser is to the shop, kept for good: the shop sees the same visitor come back
  // the next day. `left` belongs to the id, so a new id starts at three, as the hook does.
  // `asked` says there may be guest questions for an account to claim.
  visitor: Alpine.$persist({ id: '', left: GUEST_QUESTIONS, asked: false }).as(storageKey('visitor')),

  // What this tab has asked and been told as a guest, per product, and only for as long as the
  // tab is open. The server never sends a guest's conversation back, so this is all they see.
  transcript: Alpine.$persist({ visitor: '', products: {} }).as(storageKey('chat')).using(sessionStorage),

  // A customer's conversations, per product: read again on every visit, never stored, and
  // dropped the moment the session ends.
  conversations: {},

  faqs: [],
  faqsLoaded: false,

  guestQuestions: GUEST_QUESTIONS,
  maxLength: MAX_LENGTH,

  // The shop's clock. An automatic reply waits with the moment it is due, and shows once this
  // reaches it. A reload shows whatever fell due in the meantime.
  now: Date.now(),

  // Settled before a customer's history is read, so the questions they asked as a guest are in it.
  claiming: Promise.resolve(),

  init() {
    if (!this.visitor.id) {
      this.visitor = { id: crypto.randomUUID(), left: GUEST_QUESTIONS, asked: false };
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

    this.claim(currentUser());
    onAuthChange((user) => this.claim(user));
  },

  signedIn() {
    return Alpine.store('session').isAuthenticated;
  },

  // What is on screen: everything but an automatic reply that is not due yet.
  lines(productId) {
    return this.all(productId).filter((line) => !(line.at > this.now));
  },

  typing(productId) {
    return this.all(productId).some((line) => line.at > this.now);
  },

  loading(productId) {
    return this.signedIn() && !this.conversations[productId]?.loaded;
  },

  all(productId) {
    if (!this.signedIn()) return this.transcript.products[productId] ?? [];

    const lines = [];
    for (const message of this.conversations[productId]?.messages ?? []) {
      lines.push({ from: message.from, text: message.text, faq: message.faq });

      // The answer to a pick is not stored: it is the list's, drawn after the question as it
      // was the first time, and after a pause only for a pick that arrived just now.
      const faq = message.faq && this.faqs.find((entry) => entry.id === message.faq);
      if (faq) {
        lines.push({ from: 'shop', text: faq.answer, at: message.arrived && message.arrived + this.pause(faq.answer, message.id) });
      }
    }
    return lines;
  },

  // Once per visit to the site, whichever product opens the chat first.
  async loadFaqs() {
    if (this.faqsLoaded) return;
    this.faqs = await fetchFaqs();
    this.faqsLoaded = true;
  },

  async pick(product, faq) {
    if (this.signedIn()) {
      const { message } = await sendQuestion({ visitor: this.visitor.id, product: product.id, faq: faq.id });
      this.receive(product.id, 'create', message, true);
      return;
    }

    // A guest's answer is already here, so it does not wait on the request, and the shop learns
    // what was asked on the way. A pick that fails to arrive costs the visitor nothing.
    this.visitor.asked = true;
    this.say(product.id, { from: 'visitor', text: faq.question, faq: faq.id });
    this.reply(product.id, faq.answer);

    sendQuestion({ visitor: this.visitor.id, product: product.id, faq: faq.id })
      .then(({ left }) => this.count(left))
      .catch((err) => console.error(err));
  },

  // Written by the visitor: it shows only once the shop has it, so a question that failed to
  // send is still in the box to try again.
  async ask(product, text) {
    let answer;
    try {
      answer = await sendQuestion({ visitor: this.visitor.id, product: product.id, text });
    } catch (err) {
      if (err.status === 403) this.visitor.left = 0; // the hook counted what this browser forgot
      throw err;
    }

    // A customer is talking to a person, who answers in their own time.
    if (answer.left === null) {
      this.receive(product.id, 'create', answer.message, true);
      return;
    }

    this.visitor.asked = true;
    this.count(answer.left);
    this.say(product.id, { from: 'visitor', text: text.trim() });
    this.reply(product.id, t('chat.received'));
  },

  // Opens a customer's conversation about a product: what was already said, and from then on
  // whatever is said, as it is said. The history does not wait on the live connection, which
  // some networks and proxies never let through: without it the chat still works, and a reply
  // shows once the page is opened again. Once the connection is up the history is read a second
  // time, so a reply that landed while it was being made is not missed.
  async follow(productId) {
    if (this.conversations[productId]) return;

    this.conversations[productId] = { messages: [], loaded: false, unsubscribe: null, reported: null };
    const conversation = this.conversations[productId];
    const current = () => this.conversations[productId] === conversation;

    const read = async () => {
      const history = await fetchConversation(productId);
      if (!current()) return;
      for (const message of history) this.receive(productId, 'create', message, false);
      conversation.loaded = true;
    };

    await this.claiming;
    if (!current()) return;

    subscribeToConversation(productId, (action, message) => this.receive(productId, action, message, true))
      .then((unsubscribe) => {
        if (!current()) return unsubscribe(); // signed out, or left the page, while this was on its way
        conversation.unsubscribe = unsubscribe;
        return read();
      })
      .catch((err) => console.error(err)); // no live updates, and nothing else is lost

    try {
      await read();
    } catch (err) {
      if (current()) this.unfollow(productId); // so opening the panel again tries again
      throw err;
    }
  },

  // The customer has the conversation on screen. Said once per reply from the shop, so the
  // server can drop the mail it would otherwise send about it.
  seen(productId) {
    const conversation = this.conversations[productId];
    if (!conversation?.loaded) return;

    const reply = conversation.messages.findLast((message) => message.from === 'shop');
    if (!reply || conversation.reported === reply.id) return;

    conversation.reported = reply.id;
    markSeen(productId).catch((err) => {
      conversation.reported = null; // the next look tries again
      console.error(err);
    });
  },

  unfollow(productId) {
    this.conversations[productId]?.unsubscribe?.();
    delete this.conversations[productId];
  },

  // One message into a customer's conversation, whichever way it came: the answer to sending
  // it, realtime, or the history. The first two can bring the same message twice.
  receive(productId, action, message, live) {
    const conversation = this.conversations[productId];
    if (!conversation) return;

    const known = conversation.messages.find((entry) => entry.id === message.id);
    const others = conversation.messages.filter((entry) => entry.id !== message.id);

    if (action === 'delete') {
      conversation.messages = others;
      return;
    }

    // Stamped when it is first seen being sent: the answer to a pick waits from this moment.
    // An edit made in the dashboard is live too, but nobody is waiting on its answer.
    const fresh = !known && live && action === 'create';
    const arrived = known ? known.arrived : fresh ? Date.now() : undefined;
    conversation.messages = [...others, { ...message, arrived }].sort((a, b) => a.sentAt.localeCompare(b.sentAt));

    const faq = fresh && message.faq && this.faqs.find((entry) => entry.id === message.faq);
    if (faq) this.wake(arrived + this.pause(faq.answer, message.id));
  },

  // A guest's questions become the account's as soon as there is one: on signing in, on
  // registering, and on a page that opens with a session already there. Signing out drops
  // every conversation the account had open.
  claim(user) {
    if (!user) {
      for (const productId of Object.keys(this.conversations)) this.unfollow(productId);
      return;
    }
    if (this.visitor.asked === false) return;

    this.claiming = claimConversations(this.visitor.id)
      .then(() => {
        this.visitor.asked = false;
        this.visitor.left = GUEST_QUESTIONS; // what was counted belongs to the account now

        // The account's now, and read from the server from here on. Kept, it would show again
        // in this tab after signing out, to whoever uses the browser next.
        this.transcript = { visitor: this.visitor.id, products: {} };
      })
      .catch((err) => console.error(err));
  },

  say(productId, line) {
    this.transcript.products[productId] = [...(this.transcript.products[productId] ?? []), line];
  },

  reply(productId, text) {
    const at = Date.now() + this.pause(text);
    this.say(productId, { from: 'shop', text, at });
    this.wake(at);
  },

  // How long an automatic reply takes, as a person's would: longer for a longer answer, never
  // quite the same twice, never past a couple of seconds. A seed gives the same pause every
  // time the same reply is drawn.
  pause(text, seed = String(Math.random())) {
    let jitter = 0;
    for (const char of seed) jitter = (jitter * 31 + char.charCodeAt(0)) % 300;
    return Math.min(700 + text.length * 6, 2000) + jitter;
  },

  wake(at) {
    setTimeout(() => (this.now = Math.max(Date.now(), at)), at - Date.now());
  },

  count(left) {
    if (left !== null) this.visitor.left = left;
  },
});
