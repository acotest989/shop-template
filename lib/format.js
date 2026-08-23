// Currency comes from the data, number formatting from the visitor's locale.
export function money(cents, currency = 'EUR', locale) {
  return (cents / 100).toLocaleString(locale, { style: 'currency', currency });
}

export function discountPercent(price, compareAt) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round((1 - price / compareAt) * 100);
}

// How much of a five-star row is filled. Cut down to the half star, never up, so the
// row never claims more than the score: 2.8 shows two and a half, not three.
export function starPercent(rating = 0) {
  return (Math.round(rating * 2) / 2 / 5) * 100;
}
