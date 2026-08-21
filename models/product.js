// What a product is in this app. The API's shape stops here.

const slugify = (title) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// The API speaks dollars and a discount percentage; the app speaks cents and a compare-at price.
export function toProduct(raw) {
  const price = Math.round(raw.price * 100);
  const discount = raw.discountPercentage ?? 0;

  return {
    id: raw.id,
    handle: slugify(raw.title),
    title: raw.title,
    vendor: raw.brand ?? raw.category,
    price,
    compare_at_price: discount > 0 ? Math.round(price / (1 - discount / 100)) : null,
    currency: 'EUR',
    available: raw.availabilityStatus !== 'Out of Stock' && raw.stock > 0,
    stock: raw.stock,
    rating: raw.rating,
    tags: raw.tags ?? [],
    image: raw.thumbnail,
  };
}
