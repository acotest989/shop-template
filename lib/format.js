// Currency comes from the data, number formatting from the visitor's locale.
export function money(cents, currency = 'EUR', locale) {
  return (cents / 100).toLocaleString(locale, { style: 'currency', currency });
}

// A price as somebody types it into a field, in the shop's units, to cents: 19.99 and 19,99
// alike, and 1.299,50 as well. NaN for anything that is not a price.
export function toCents(text) {
  let value = String(text ?? '').replace(/\s/g, '');

  // Whichever of . and , comes last is the decimal point; any other is grouping.
  const point = Math.max(value.lastIndexOf('.'), value.lastIndexOf(','));
  if (point !== -1) value = value.slice(0, point).replace(/[.,]/g, '') + '.' + value.slice(point + 1);

  return /^\d+(\.\d{1,2})?$/.test(value) ? Math.round(Number(value) * 100) : NaN;
}

// Cents as a field shows them: 1999 becomes 19.99, with no grouping and no currency.
export function fromCents(cents) {
  return (cents / 100).toFixed(2);
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
