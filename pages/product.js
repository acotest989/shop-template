import { fetchProduct } from '../services/products.js';
import { setPageTitle, errorMessage } from '../alpineshell/index.js';

export const productPage = () => ({
  product: null,
  pending: true,
  error: '',

  async init() {
    try {
      this.product = await fetchProduct(this.$params.handle);
      if (!this.product) this.error = 'This product does not exist.';
      setPageTitle(this.product?.title ?? 'Product not found'); // the generic title is set before the fetch
    } catch (err) {
      console.error(err);
      this.error = errorMessage(err, 'Could not load the product.');
    } finally {
      this.pending = false;
    }
  },
});
