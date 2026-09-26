/// <reference path="../pb_data/types.d.ts" />

// Every question from the chat writes a row, and a guest needs no account to send one. The
// hook caps what a guest writes at three questions, but a new visitor id costs nothing, so
// this is what bounds the rows one address can add. Looser than placing an order, because
// picking from the list goes through the same route and a curious visitor clicks several.
//
// Counted per IP, which only holds once the trusted proxy header is set; see the README.
migrate(
  (app) => {
    const label = 'POST /api/shop/chat';
    const settings = app.settings();

    const rules = [];
    for (const rule of settings.rateLimits.rules) {
      if (rule.label !== label) rules.push(rule);
    }

    rules.push({ label: label, audience: '', duration: 600, maxRequests: 30 });

    settings.rateLimits.rules = rules;
    app.save(settings);
  },
  (app) => {
    const label = 'POST /api/shop/chat';
    const settings = app.settings();

    const rules = [];
    for (const rule of settings.rateLimits.rules) {
      if (rule.label !== label) rules.push(rule);
    }

    settings.rateLimits.rules = rules;
    app.save(settings);
  },
);
