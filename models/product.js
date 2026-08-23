export function toProduct(raw) {
  return {
    id: raw.id,
    handle: raw.handle,
    title: raw.title,
    brand: raw.brand,
    category: raw.category,
    price: raw.price_cents,
    regularPrice: raw.regular_price_cents,
    currency: raw.currency,
    available: raw.stock > 0,
    stock: raw.stock,
    sold: raw.sold,
    rating: raw.rating,
    tags: raw.tags ?? [],
    image: raw.image,
  };
}
