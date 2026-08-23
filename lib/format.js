// Currency comes from the data, number formatting from the visitor's locale.
export function money(cents, currency = 'EUR', locale) {
  return (cents / 100).toLocaleString(locale, { style: 'currency', currency });
}

export function formatDate(value, options = { dateStyle: 'medium' }, locale) {
  return new Date(value).toLocaleString(locale, options);
}

export function discountPercent(price, compareAt) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round((1 - price / compareAt) * 100);
}

// How much of a five-star row is filled, snapped to the nearest half the way shops
// show it, so a score reads as a shape instead of a sliver.
export function starPercent(rating = 0) {
  return (Math.round(rating * 2) / 2 / 5) * 100;
}
