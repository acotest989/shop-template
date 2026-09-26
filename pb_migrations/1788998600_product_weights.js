/// <reference path="../pb_data/types.d.ts" />

// What every product weighs packed for the courier, in grams. Shipping is free for an
// order worth enough only while it stays light enough, and that needs a weight on
// everything in the cart.
//
// Required from here on, so the dashboard asks for one on every product it saves. The
// demo catalogue gets estimates by category rather than by product: close enough to
// show the rule working, and a real shop enters its own anyway.
migrate(
  (app) => {
    const products = app.findCollectionByNameOrId('products');
    products.fields.add(new NumberField({ name: 'weight', required: true, onlyInt: true }));
    app.save(products);

    const grams = {
      'beauty': 200,
      'fragrances': 400,
      'furniture': 40000,
      'groceries': 1000,
      'home-decoration': 2000,
      'kitchen-accessories': 1000,
      'laptops': 2500,
      'mens-shirts': 300,
      'mens-shoes': 1200,
      'mens-watches': 400,
      'mobile-accessories': 600,
      'motorcycle': 200000,
      'smartphones': 400,
      'sports-accessories': 1000,
      'sunglasses': 200,
      'tops': 400,
      'vehicle': 1500000,
      'womens-bags': 1000,
      'womens-dresses': 600,
      'womens-shoes': 1000,
      'womens-watches': 400,
    };

    // One statement a category rather than a hundred and five record saves.
    for (const category in grams) {
      app.db()
        .newQuery('UPDATE products SET weight = {:grams} WHERE category = {:category}')
        .bind({ grams: grams[category], category: category })
        .execute();
    }
  },
  (app) => {
    const products = app.findCollectionByNameOrId('products');
    products.fields.removeByName('weight');
    app.save(products);
  },
);
