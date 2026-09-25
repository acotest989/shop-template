export function toProduct(raw) {
  return {
    id: raw.id,
    handle: raw.handle,
    title: raw.title,
    brand: raw.brand,
    category: raw.category,
    description: raw.description, // the card never asks for it, so on a grid it is undefined
    price: raw.price_cents,
    regularPrice: raw.regular_price_cents,
    currency: raw.currency,

    // Only an admin ever gets a hidden one, opening its page; a card never asks for the field.
    hidden: raw.hidden === true,
    available: raw.stock > 0 && raw.hidden !== true,
    stock: raw.stock,
    sold: raw.sold,
    weight: raw.weight, // grams, packed: what decides whether an order ships free
    rating: raw.rating,
    tags: raw.tags ?? [],
    image: raw.image,

    // The gallery, and only the product page asks for it. A product with one picture
    // gets an array of one, so the page has a single rule rather than two cases.
    images: raw.images?.length ? raw.images : [raw.image],
  };
}
