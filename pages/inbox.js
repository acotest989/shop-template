import { errorMessage } from 'alpineshell';
import {
  fetchThreads,
  subscribeToThreads,
  fetchMessages,
  subscribeToMessages,
  sendReply,
  markAnswered,
  deleteThread,
  clearInbox,
} from '../services/inbox.js';

// MAX_LENGTH in server/pb_hooks/inbox.pb.js, which is the one that counts.
const MAX_LENGTH = 2000;

const newestFirst = (a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt);
const oldestFirst = (a, b) => a.sentAt.localeCompare(b.sentAt);

// The shop's inbox: every conversation on the left, the open one on the right, both kept
// current by realtime. On a phone it is one or the other.
export const inboxPage = () => ({
  threads: [],
  filter: 'waiting', // or 'all'
  pending: true,
  error: '',

  selectedId: '',
  messages: [],
  loadingMessages: false,
  messagesError: '',

  draft: '',
  sending: false,
  sendError: '',
  maxLength: MAX_LENGTH,

  confirmingDelete: false,
  deleting: false,

  confirmingClear: false,
  clearing: false,

  stopThreads: null,
  stopMessages: null,
  gone: false, // the page was left while a subscription was still on its way

  get allowed() {
    return this.$store.session.user?.admin === true;
  },

  get shown() {
    return this.filter === 'waiting' ? this.threads.filter((thread) => thread.waiting) : this.threads;
  },

  get waitingCount() {
    return this.threads.filter((thread) => thread.waiting).length;
  },

  get selected() {
    return this.threads.find((thread) => thread.id === this.selectedId) ?? null;
  },

  async init() {
    // The server refuses such an account everything anyway; this only spares it a page of errors.
    if (!this.allowed) {
      this.pending = false;
      return;
    }

    try {
      // Subscribed before reading, and whatever lands in between is held until the list is in.
      const early = [];
      let loaded = false;
      const stop = await subscribeToThreads((action, thread) =>
        loaded ? this.receiveThread(action, thread) : early.push([action, thread]),
      );
      if (this.gone) return stop();
      this.stopThreads = stop;

      this.threads = await fetchThreads();
      for (const [action, thread] of early) this.receiveThread(action, thread);
      loaded = true;

      // A link straight to one conversation: /admin/inbox?thread=…
      const wanted = new URLSearchParams(location.search).get('thread');
      if (wanted) this.open(wanted);
    } catch (err) {
      console.error(err);
      this.error = errorMessage(err, 'Could not load the inbox.');
    } finally {
      this.pending = false;
    }
  },

  destroy() {
    this.gone = true;
    this.stopThreads?.();
    this.stopMessages?.();
    this.selectedId = '';
  },

  receiveThread(action, thread) {
    const others = this.threads.filter((entry) => entry.id !== thread.id);
    this.threads = action === 'delete' ? others : [thread, ...others].sort(newestFirst);
    if (action === 'delete' && thread.id === this.selectedId) this.open('');
  },

  receiveMessage(action, message) {
    const others = this.messages.filter((entry) => entry.id !== message.id);
    this.messages = action === 'delete' ? others : [...others, message].sort(oldestFirst);
    this.scrollDown();
  },

  async open(threadId) {
    if (threadId === this.selectedId) return;

    this.stopMessages?.();
    this.stopMessages = null;
    this.selectedId = threadId;
    this.messages = [];
    this.messagesError = '';
    this.sendError = '';
    this.draft = '';
    this.confirmingDelete = false;

    // Kept in the address, so a reload or a shared link opens the same conversation.
    history.replaceState(history.state, '', threadId ? `/admin/inbox?thread=${encodeURIComponent(threadId)}` : '/admin/inbox');
    if (!threadId) return;

    const current = () => this.selectedId === threadId;
    this.loadingMessages = true;

    try {
      const early = [];
      let loaded = false;
      const stop = await subscribeToMessages(threadId, (action, message) =>
        loaded ? this.receiveMessage(action, message) : early.push([action, message]),
      );
      if (!current()) return stop();
      this.stopMessages = stop;

      const messages = await fetchMessages(threadId);
      if (!current()) return;
      this.messages = messages;
      for (const [action, message] of early) this.receiveMessage(action, message);
      loaded = true;
      this.scrollDown();
    } catch (err) {
      console.error(err);
      if (current()) this.messagesError = errorMessage(err, 'Could not load this conversation.');
    } finally {
      if (current()) this.loadingMessages = false;
    }
  },

  async send() {
    const threadId = this.selectedId;
    if (this.sending || !threadId || !this.draft.trim()) return;

    this.sending = true;
    this.sendError = '';
    try {
      const message = await sendReply(threadId, this.draft);
      if (threadId === this.selectedId) {
        this.receiveMessage('create', message);
        this.draft = '';
      }
    } catch (err) {
      this.sendError = errorMessage(err, 'The reply could not be sent. Try again.');
    } finally {
      this.sending = false;
    }
  },

  async answered() {
    const thread = this.selected;
    if (!thread) return;

    try {
      await markAnswered(thread.id);
      this.receiveThread('update', { ...thread, waiting: false }); // realtime says the same a moment later
    } catch (err) {
      console.error(err);
      this.notify(errorMessage(err, 'Could not mark the conversation as answered.'), 'error');
    }
  },

  // Asked first on the page, since nothing brings a deleted conversation back.
  async remove() {
    const thread = this.selected;
    if (!thread || this.deleting) return;

    this.deleting = true;
    try {
      await deleteThread(thread.id);
      this.receiveThread('delete', thread); // realtime says the same a moment later
      this.notify('Conversation deleted.', 'success');
    } catch (err) {
      console.error(err);
      this.notify(errorMessage(err, 'Could not delete the conversation.'), 'error');
    } finally {
      this.deleting = false;
      this.confirmingDelete = false;
    }
  },

  // Everything the list shows, up to its newest conversation. One that arrives while the shop
  // is confirming is newer than that, and stays.
  async clear() {
    const before = this.threads[0]?.lastMessageAt; // the list is newest first
    if (!before || this.clearing) return;

    this.clearing = true;
    try {
      const deleted = await clearInbox(before);
      for (const thread of this.threads.filter((entry) => entry.lastMessageAt <= before)) {
        this.receiveThread('delete', thread); // realtime says the same a moment later
      }
      this.notify(deleted === 1 ? '1 conversation deleted.' : `${deleted} conversations deleted.`, 'success');
    } catch (err) {
      console.error(err);
      this.notify(errorMessage(err, 'Could not clear the inbox.'), 'error');
    } finally {
      this.clearing = false;
      this.confirmingClear = false;
    }
  },

  // Other conversations from the same browser: a guest who came back, or a customer who asked
  // as a guest before signing in.
  sameBrowser(thread) {
    return this.threads.filter((entry) => entry.id !== thread.id && entry.visitor === thread.visitor).length;
  },

  // For the list, where room is short: today's by the clock, anything older by the date.
  when(value) {
    if (!value) return '';
    return this.formatDate(value, this.today(value) ? { timeStyle: 'short' } : { dateStyle: 'medium' });
  },

  // For a message: always the date and the time, today's included.
  timeOf(value) {
    if (!value) return '';
    return this.formatDate(value, { dateStyle: 'medium', timeStyle: 'short' });
  },

  today(value) {
    return new Date(value).toDateString() === new Date().toDateString();
  },

  scrollDown() {
    this.$nextTick(() => {
      const log = document.getElementById('inbox-log'); // inside x-if, where $refs does not reach
      if (log) log.scrollTop = log.scrollHeight;
    });
  },
});
