import { errorMessage } from 'alpineshell';

// The chat on a product page. What is said lives in the chat store; this keeps only what
// belongs to the open panel. `product` is the page's, one scope up, which is what makes the
// product the conversation's subject.
export const chatWidget = () => ({
  open: false,
  draft: '',
  pending: false,
  error: '',

  init() {
    // On a phone the panel covers the page, so the page stops scrolling under it. The rule that
    // reads this class is in assets/theme.css.
    this.$watch('open', (open) => document.documentElement.classList.toggle('chat-open', open));

    // Whatever appears at the end is scrolled to, the shop's delayed replies included.
    this.$watch('lines.length', () => this.scrollDown());
    this.$watch('typing', () => this.scrollDown());
  },

  // Leaving the page with the chat open must not leave the next one unable to scroll.
  destroy() {
    document.documentElement.classList.remove('chat-open');
  },

  get lines() {
    return this.$store.chat.lines(this.product.id);
  },

  // While the shop is typing, the list and the send button wait: anything said now would land
  // above the reply once it shows.
  get typing() {
    return this.$store.chat.typing(this.product.id);
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

  toggle() {
    this.open = !this.open;
    if (!this.open) return;

    this.$store.chat.loadFaqs().catch((err) => console.error(err)); // the box still works without the list
    this.scrollDown();
  },

  // Back to the button that opened it, so a keyboard is not left somewhere in the page.
  close() {
    this.open = false;
    this.$refs.launcher.focus();
  },

  pick(faq) {
    if (this.typing) return;
    this.$store.chat.pick(this.product, faq);
  },

  async send() {
    if (this.pending || this.typing || !this.draft.trim()) return;

    this.pending = true;
    this.error = '';
    try {
      await this.$store.chat.ask(this.product, this.draft);
      this.draft = '';
    } catch (err) {
      this.error = errorMessage(err, 'Your question could not be sent. Try again.');
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
