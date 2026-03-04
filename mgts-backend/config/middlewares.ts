export default [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      // Dev-only: allow embedding Strapi media (PDF) in local preview pages.
      frameguard: false,
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'frame-ancestors': [
            "'self'",
            'http://localhost:8000',
            'http://127.0.0.1:8000',
            'http://localhost:8001',
            'http://127.0.0.1:8001',
            'http://localhost:8002',
            'http://127.0.0.1:8002',
            'http://localhost:8080',
            'http://127.0.0.1:8080',
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:5173',
            'http://127.0.0.1:5173',
          ],
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      // Dev-only: allow local design pages + common frontend dev servers.
      // IMPORTANT: when opening HTML via file:// the browser sends Origin: null.
      // Prefer serving design pages via http://localhost:8000 (see runbook) instead.
      origin: [
        'http://localhost:8000',
        'http://127.0.0.1:8000',
        'http://localhost:8001',
        'http://127.0.0.1:8001',
        'http://localhost:8002',
        'http://127.0.0.1:8002',
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'null',
      ],
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
      credentials: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
