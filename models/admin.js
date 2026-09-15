// A product as the overview's stock list draws it: what it is, where it lives, how many are left.
export function toStockItem(raw) {
  return {
    id: raw.id,
    handle: raw.handle,
    title: raw.title,
    image: raw.image,
    stock: raw.stock ?? 0,
  };
}
