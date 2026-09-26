/// <reference path="../../pb_data/types.d.ts" />

// The catalogue as an admin edits it at /admin/products: a new product, or every field of one
// that exists. The collection refuses writes from a browser, so the route in pb_hooks/shop.pb.js
// is the only way in from the shop; the dashboard is the other.
//
// Nothing here deletes. A product leaves the shop by being hidden, since orders and
// conversations name it, and cancelling or returning an order puts its goods back on it.

const MAX_TITLE = 200;
const MAX_BRAND = 100;
const MAX_DESCRIPTION = 5000;
const MAX_PICTURES = 12;
const MAX_TAGS = 20;

// https only: a shop served over https shows an http picture as a broken one.
const PICTURE = /^https:\/\/\S+$/;

const text = (value) => String(value == null ? '' : value).trim();

// A list sent as JSON, read by index: what arrives is a Go slice, and not every array method is
// certain to be on it.
const list = (value) => {
  const items = [];
  if (!value || typeof value === 'string' || typeof value.length !== 'number') return items;
  for (let i = 0; i < value.length; i++) {
    const item = text(value[i]);
    if (item && items.indexOf(item) === -1) items.push(item);
  }
  return items;
};

// The shop's addresses and categories are written this way: lower case and dashes, with the
// letters of a Bosnian name folded rather than dropped, so Čaša becomes casa and not -asa. Those
// five by hand, and any other accent by normalize where the engine has it.
const slug = (value) => {
  let folded = String(value || '').toLowerCase()
    .replace(/đ/g, 'dj').replace(/[čć]/g, 'c').replace(/š/g, 's').replace(/ž/g, 'z')
    .replace(/['’]/g, '');
  try {
    folded = folded.normalize('NFD').replace(/[̀-ͯ]/g, '');
  } catch (err) {
    // an engine without normalize: the letters it cannot fold turn into dashes
  }
  return folded.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
};

// POST /api/shop/admin/products/save
function save(e) {
  // What a refusal says: lib/lang.js.
  const lang = require(__hooks + '/lib/lang.js').open();
  const body = e.requestInfo().body || {};

  const id = text(body.id);
  const title = text(body.title);
  const brand = text(body.brand);
  const category = slug(body.category);
  const description = text(body.description);
  const price = Number(body.price);
  const regularPrice = Number(body.regularPrice || 0);
  const stock = Number(body.stock);
  const weight = Number(body.weight);
  const image = text(body.image);
  const images = list(body.images);
  const tags = list(body.tags).map((tag) => tag.toLowerCase());
  const hidden = body.hidden === true;

  // Every problem at once, each on its field, in words the form shows as they are.
  const errors = {};
  const fail = (field, code, message) => {
    errors[field] = new ValidationError(code, message);
  };

  if (!title) fail('title', 'required', lang.t('products.name'));
  else if (title.length > MAX_TITLE) fail('title', 'too_long', lang.t('products.tooLong', { n: MAX_TITLE }));

  if (brand.length > MAX_BRAND) fail('brand', 'too_long', lang.t('products.tooLong', { n: MAX_BRAND }));
  if (!category) fail('category', 'required', lang.t('products.category'));

  if (!Number.isInteger(price) || price <= 0) fail('price', 'invalid', lang.t('products.price'));
  if (!Number.isInteger(regularPrice) || regularPrice < 0 || (regularPrice > 0 && regularPrice <= price)) {
    fail('regularPrice', 'invalid', lang.t('products.regularPrice'));
  }

  if (!Number.isInteger(stock) || stock < 0) fail('stock', 'invalid', lang.t('products.stock'));
  if (!Number.isInteger(weight) || weight <= 0) fail('weight', 'invalid', lang.t('products.weight'));

  if (!PICTURE.test(image)) fail('image', 'invalid', lang.t('products.image'));
  if (images.length > MAX_PICTURES) {
    fail('images', 'too_many', lang.t('products.tooManyPictures', { n: MAX_PICTURES }));
  } else if (images.some((url) => !PICTURE.test(url))) {
    fail('images', 'invalid', lang.t('products.images'));
  }

  if (tags.length > MAX_TAGS) fail('tags', 'too_many', lang.t('products.tooManyTags', { n: MAX_TAGS }));
  if (description.length > MAX_DESCRIPTION) fail('description', 'too_long', lang.t('products.tooLong', { n: MAX_DESCRIPTION }));

  if (Object.keys(errors).length) {
    throw new BadRequestError(lang.t('products.checkForm'), errors);
  }

  let saved = null;

  // One transaction, so the stock read below is still the stock when the product is written.
  $app.runInTransaction((tx) => {
    let record;

    if (id) {
      try {
        record = tx.findRecordById('products', id);
      } catch (err) {
        throw new NotFoundError(lang.t('products.gone'));
      }

      // The form sends the stock it opened with. Left as it was, the stock is not written at
      // all, so a sale made while the page was open stands. Changed, it is written only over the
      // number the admin saw; anything else would put back what an order just took.
      const current = record.getInt('stock');
      const was = Number(body.stockWas);
      if (stock !== was) {
        if (current !== was) {
          throw new BadRequestError(lang.t('products.checkForm'), {
            stock: new ValidationError('stock_changed', lang.t('products.stockChanged', { n: current })),
          });
        }
        record.set('stock', stock);
      }
    } else {
      record = new Record(tx.findCollectionByNameOrId('products'));

      // Made once, from the name, and kept: an address already shared has to go on working.
      const taken = (handle) => {
        try {
          tx.findFirstRecordByFilter('products', 'handle = {:handle}', { handle: handle });
          return true;
        } catch (err) {
          return false;
        }
      };
      const base = slug(title) || 'product';
      let handle = base;
      for (let n = 2; taken(handle); n++) {
        if (n > 999) throw new BadRequestError(lang.t('products.nameTaken'));
        handle = base + '-' + n;
      }
      record.set('handle', handle);

      // One currency for the whole shop: the cart refuses to mix them.
      let currency = 'EUR';
      try {
        currency = tx.findFirstRecordByFilter('products', 'currency != ""').getString('currency');
      } catch (err) {
        // the first product of all takes the template's
      }
      record.set('currency', currency);
      record.set('stock', stock);
    }

    record.set('title', title);
    record.set('brand', brand);
    record.set('category', category);
    record.set('description', description);
    record.set('price_cents', price);
    record.set('regular_price_cents', regularPrice);
    record.set('weight', weight);
    record.set('image', image);
    record.set('images', images);
    record.set('tags', tags);
    record.set('hidden', hidden);
    tx.save(record);

    saved = record;
  });

  return e.json(200, saved);
}

module.exports = { save };
