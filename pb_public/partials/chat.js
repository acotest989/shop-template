import { errorMessage } from 'alpineshell';
import { t } from '../lib/i18n.js';

// The chat on a product page. What is said lives in the chat store; this keeps only what
// belongs to the open panel. `product` is the page's, one scope up, which is what makes the
// product the conversation's subject.
export const chatWidget = () => ({
  open: false,
  draft: '',
  pending: false,
  error: '',
  readCount: 0, // lines on screen the last time the panel was open

  init() {
    // On a phone the panel covers the page, so the page stops scrolling under it. The rule that
    // reads this class is in assets/theme.css.
    this.$watch('open', (open) => document.documentElement.classList.toggle('chat-open', open));

    // Whatever appears at the end is scrolled to, the shop's replies included, and a reply that
    // shows in the open panel counts as seen, so no mail follows it.
    this.$watch('lines.length', (length) => {
      if (this.open) {
        this.readCount = length;
        this.$store.chat.seen(this.product.id);
      }
      this.scrollDown();
    });
    this.$watch('loading', (loading) => {
      if (!loading && this.open) this.$store.chat.seen(this.product.id);
    });
    this.$watch('typing', () => this.scrollDown());

    // Signing in with the panel open, in another tab say, turns it into the customer's own.
    this.$watch('guest', (guest) => {
      if (!guest && this.open) this.follow();
    });

    // The link in the mail about a reply opens the conversation straight away: /products/…?chat
    if (new URLSearchParams(location.search).has('chat')) this.toggle();
  },

  // Leaving the page must not leave the next one unable to scroll, or keep listening for
  // replies about a product nobody is looking at.
  destroy() {
    document.documentElement.classList.remove('chat-open');
    this.$store.chat.unfollow(this.product.id);
  },

  get lines() {
    return this.$store.chat.lines(this.product.id);
  },

  // While the shop is typing, the list and the send button wait: anything said now would land
  // above the reply once it shows.
  get typing() {
    return this.$store.chat.typing(this.product.id);
  },

  get loading() {
    return this.$store.chat.loading(this.product.id);
  },

  // Something arrived while the panel was closed: a reply from the shop, most likely.
  get unread() {
    return !this.open && this.lines.length > this.readCount;
  },

  // Asked once, gone from the list, so the list only ever offers something new.
  get unasked() {
    const asked = this.lines.map((line) => line.faq);
    return this.$store.chat.faqs.filter((faq) => !asked.includes(faq.id));
  },

  get guest() {
    return !this.$store.session.isAuthenticated;
  },

  get canWrite() {
    return !this.guest || this.$store.chat.visitor.left > 0;
  },

  // Where signing in or creating an account brings the visitor back to: this product.
  get back() {
    return '?next=' + encodeURIComponent(location.pathname);
  },

  toggle() {
    this.open = !this.open;
    if (!this.open) return;

    this.readCount = this.lines.length;
    this.$store.chat.loadFaqs().catch((err) => console.error(err)); // the box still works without the list
    if (!this.guest) this.follow();
    this.$store.chat.seen(this.product.id); // reopened on a conversation already loaded
    this.scrollDown();
  },

  // Back to the button that opened it, so a keyboard is not left somewhere in the page.
  close() {
    this.open = false;
    this.$refs.launcher.focus();
  },

  follow() {
    this.error = '';
    this.$store.chat.follow(this.product.id).catch((err) => {
      console.error(err);
      this.error = errorMessage(err, t('chat.loadError'));
    });
  },

  async pick(faq) {
    if (this.pending || this.typing) return;

    this.pending = true;
    this.error = '';
    try {
      await this.$store.chat.pick(this.product, faq);
    } catch (err) {
      this.error = errorMessage(err, t('chat.pickError'));
    } finally {
      this.pending = false;
    }
  },

  async send() {
    if (this.pending || this.typing || !this.draft.trim()) return;

    this.pending = true;
    this.error = '';
    try {
      await this.$store.chat.ask(this.product, this.draft);
      this.draft = '';
    } catch (err) {
      this.error = errorMessage(err, t('chat.sendError'));
    } finally {
      this.pending = false;
    }
  },

  scrollDown() {
    this.$nextTick(() => {
      const log = this.$refs.log;
      if (log) log.scrollTop = log.scrollHeight;
    });
  },
});
