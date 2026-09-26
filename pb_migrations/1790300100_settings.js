/// <reference path="../pb_data/types.d.ts" />

// Settings are not written to migrations the way collection changes are, so without this file a
// fresh checkout or a deploy would come up with no limits at all.
//
// The mail rules matter most: request-password-reset sends a message to whatever address is
// posted, so an unlimited endpoint lets anyone flood a stranger's inbox from this server — and
// take the domain's mail reputation down with it. The shop's own routes have rules of their own:
// every order is a made-up cash-on-delivery order until the courier says otherwise, and every
// question can mail the shop.
migrate(
  (app) => {
    const settings = app.settings();

    settings.rateLimits.enabled = true;
    settings.rateLimits.rules = [
      // Password guessing. Generous for a person, hopeless for a script.
      { label: '*:auth', audience: '', duration: 60, maxRequests: 10 },

      // One message per attempt, so these are counted in minutes, not seconds.
      { label: 'POST /api/collections/users/request-password-reset', audience: '', duration: 300, maxRequests: 3 },
      { label: 'POST /api/collections/users/request-verification', audience: '', duration: 300, maxRequests: 3 },
      { label: 'POST /api/collections/users/request-email-change', audience: '', duration: 300, maxRequests: 3 },

      // Signup floods.
      { label: 'users:create', audience: '@guest', duration: 3600, maxRequests: 5 },

      // Everything else: high enough that normal browsing never notices.
      { label: '/api/', audience: '', duration: 10, maxRequests: 300 },

      // Five orders in ten minutes from one address: more than a household places, and a ceiling
      // on how much stock one visitor can tie up with orders nobody will pay for.
      { label: 'POST /api/shop/orders', audience: '', duration: 600, maxRequests: 5 },

      // Picking from the chat's list costs nothing, and a customer may talk; the guest cap on
      // written questions is in pb_hooks/lib/chat.js.
      { label: 'POST /api/shop/chat', audience: '', duration: 600, maxRequests: 30 },
    ];

    app.save(settings);
  },
  (app) => {
    const settings = app.settings();

    settings.rateLimits.enabled = false;
    settings.rateLimits.rules = [];

    app.save(settings);
  },
);
