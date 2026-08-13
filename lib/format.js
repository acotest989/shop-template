// Currency comes from the data, number formatting from the visitor's locale.
export function money(cents, currency = 'EUR', locale) {
  return (cents / 100).toLocaleString(locale, { style: 'currency', currency });
}

export function discountPercent(price, compareAt) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round((1 - price / compareAt) * 100);
}
