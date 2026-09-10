/// <reference path="../pb_data/types.d.ts" />

// Placing an order is a signup and a mailer in one request: it opens an account for
// whatever address was typed, writes to that address, and takes stock off the shelf.
// Under the catch-all /api/ rule, three hundred of those get through every ten seconds.
//
// Counted per IP, like every rule here — which only holds once the trusted proxy header
// is set. Behind a proxy every visitor arrives from the proxy's own address, and five
// orders every ten minutes becomes the whole shop's allowance. See the README.
//
// Added to the rules rather than written over them, so a limit tuned in the dashboard
// survives, and the way back takes out this one rule and nothing else.
migrate(
  (app) => {
    const label = 'POST /api/shop/orders';
    const settings = app.settings();

    // A rule already under this label, added by hand in the dashboard, say, is
    // replaced rather than doubled.
    const rules = [];
    for (const rule of settings.rateLimits.rules) {
      if (rule.label !== label) rules.push(rule);
    }

    // More than anybody buying needs, and a stranger's inbox gets five letters, not
    // thousands.
    rules.push({ label: label, audience: '', duration: 600, maxRequests: 5 });

    settings.rateLimits.rules = rules;
    app.save(settings);
  },
  (app) => {
    const label = 'POST /api/shop/orders';
    const settings = app.settings();

    const rules = [];
    for (const rule of settings.rateLimits.rules) {
      if (rule.label !== label) rules.push(rule);
    }

    settings.rateLimits.rules = rules;
    app.save(settings);
  },
);
