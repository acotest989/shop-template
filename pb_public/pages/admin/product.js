import { form, errorMessage, setPageTitle } from 'alpineshell';
import { fetchAdminProduct, fetchProductOptions, saveProduct } from '../../services/admin.js';
import { toCents, fromCents } from '../../lib/format.js';
import { humanize } from '../../lib/helpers.js';
import { t } from '../../lib/i18n.js';

// The same limits as pb_hooks/products.pb.js, which is the one that counts.
const PICTURE = /^https:\/\/\S+$/;
const MAX_TITLE = 200;
const MAX_BRAND = 100;
const MAX_DESCRIPTION = 5000;
const MAX_PICTURES = 12;
const MAX_TAGS = 20;

// Every field as the form holds it: text, as typed.
const BLANK = {
  title: '',
  brand: '',
  category: '',
  description: '',
  price: '',
  regularPrice: '',
  stock: '',
  weight: '',
  image: '',
  images: '',
  tags: '',
  hidden: false,
};

// One address per line, and tags separated by commas, each counted once.
const linesOf = (text) => [...new Set(text.split('\n').map((line) => line.trim()).filter(Boolean))];
const tagsOf = (text) => [...new Set(text.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean))];

// One product, new or existing, at /admin/products/:id — 'new' for a product that is not there
// yet. No getters here: form() is spread into this object, and README says why that matters.
export const adminProductPage = () => ({
  ...form(BLANK),

  product: null, // as last saved; null while a new one is being written
  loading: true,
  loadError: '',
  categories: [],
  currency: 'EUR',
  humanize,

  // The stock the form opened with. The hook writes a changed stock only over this number, so
  // an order placed while the page was open is not quietly undone.
  stockWas: 0,

  async init() {
    const isNew = this.$params.id === 'new';

    try {
      const [options, product] = await Promise.all([
        fetchProductOptions(),
        isNew ? null : fetchAdminProduct(this.$params.id),
      ]);
      this.categories = options.categories;
      this.currency = product?.currency ?? options.currency;
      if (product) this.fill(product);
      setPageTitle(product ? product.title : t('admin.product.new'));
    } catch (err) {
      if (err.status === 404) {
        this.loadError = t('product.notFound');
      } else {
        console.error(err);
        this.loadError = errorMessage(err, t('product.loadError'));
      }
    } finally {
      this.loading = false;
    }
  },

  fill(product) {
    this.product = product;
    this.stockWas = product.stock;
    this.values = {
      title: product.title,
      brand: product.brand,
      category: product.category,
      description: product.description,
      price: fromCents(product.price),
      regularPrice: product.regularPrice ? fromCents(product.regularPrice) : '',
      stock: String(product.stock),
      weight: String(product.weight),
      image: product.image,
      images: product.images.join('\n'),
      tags: product.tags.join(', '),
      hidden: product.hidden,
    };
  },

  isPicture(url) {
    return PICTURE.test(String(url ?? '').trim());
  },

  gallery() {
    return linesOf(this.values.images).filter((url) => this.isPicture(url));
  },

  // Everything the browser can tell by itself. That the stock moved while the page was open is
  // the server's to say, and it comes back on the stock field.
  validate() {
    const v = this.values;
    const title = v.title.trim();
    const price = toCents(v.price);
    const regularPrice = v.regularPrice.trim() ? toCents(v.regularPrice) : 0;
    const images = linesOf(v.images);

    return {
      title: !title ? t('admin.product.titleMissing') : title.length > MAX_TITLE ? t('admin.product.tooLong', { n: MAX_TITLE }) : '',
      brand: v.brand.trim().length > MAX_BRAND ? t('admin.product.tooLong', { n: MAX_BRAND }) : '',
      category: v.category.trim() ? '' : t('admin.product.categoryMissing'),
      description: v.description.trim().length > MAX_DESCRIPTION ? t('admin.product.tooLong', { n: MAX_DESCRIPTION }) : '',
      price: price > 0 ? '' : t('admin.product.priceMissing'),
      regularPrice:
        Number.isNaN(regularPrice) || (regularPrice > 0 && regularPrice <= price)
          ? t('admin.product.regularPriceError')
          : '',
      stock: /^\d+$/.test(v.stock.trim()) ? '' : t('admin.product.stockError'),
      weight: /^\d+$/.test(v.weight.trim()) && Number(v.weight) > 0 ? '' : t('admin.product.weightError'),
      image: this.isPicture(v.image) ? '' : t('admin.product.imageError'),
      images:
        images.length > MAX_PICTURES
          ? t('admin.product.tooManyPictures', { n: MAX_PICTURES })
          : images.every((url) => this.isPicture(url))
            ? ''
            : t('admin.product.imagesError'),
      tags: tagsOf(v.tags).length > MAX_TAGS ? t('admin.product.tooManyTags', { n: MAX_TAGS }) : '',
    };
  },

  async save() {
    const v = this.values;
    const product = {
      id: this.product?.id,
      title: v.title.trim(),
      brand: v.brand.trim(),
      category: v.category.trim(),
      description: v.description.trim(),
      price: toCents(v.price),
      regularPrice: v.regularPrice.trim() ? toCents(v.regularPrice) : 0,
      stock: Number(v.stock),
      weight: Number(v.weight),
      image: v.image.trim(),
      images: linesOf(v.images),
      tags: tagsOf(v.tags),
      hidden: v.hidden,
    };

    let saved;
    try {
      saved = await saveProduct(product, { stockWas: this.stockWas });
    } catch (err) {
      // Sold while the page was open. The message says what the stock is now; taking that as
      // the new starting point lets a second save, once the admin has looked, go through.
      if (err.fields?.stock && this.product) {
        const fresh = await fetchAdminProduct(this.product.id).catch(() => null);
        if (fresh) this.stockWas = fresh.stock;
      }
      throw err;
    }

    const created = !this.product;
    this.fill(saved);
    setPageTitle(saved.title);
    this.notify(created ? t('admin.product.added', { title: saved.title }) : t('admin.product.saved', { title: saved.title }), 'success');

    // A new product has an address now. Replaced rather than navigated to, so the page stays
    // as it is and Back still leads to the list.
    if (created) history.replaceState(history.state, '', `/admin/products/${saved.id}`);
  },

  // The field that stopped the save may be a long way down the page.
  async send() {
    await this.submit();
    if (this.invalid()) {
      this.$nextTick(() => this.$root.querySelector('[aria-invalid="true"]')?.focus());
    }
  },
});
