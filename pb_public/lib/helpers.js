export const slugify = (title) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Only the readable half of the round trip: a slug has thrown away case and punctuation,
// so this makes one presentable rather than restoring what it was made from.
export const humanize = (slug) =>
  slug.replace(/-/g, ' ').replace(/^./, (first) => first.toUpperCase());
