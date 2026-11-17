// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  modules: ['@nuxt/ui'],

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'light',
  },

  devtools: { enabled: true },

  app: {
    head: {
      // Ikon tab browser: logo LAN versi terpotong (tanpa ruang kosong) agar tampak penuh;
      // PNG sebagai cadangan untuk browser yang belum mendukung favicon SVG.
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon-lan.svg' },
        { rel: 'icon', type: 'image/png', href: '/logo-lan.png' },
      ],
    },
  },

  routeRules: {
    '/**': {
      headers: {
        // Preview dokumen ditampilkan lewat iframe dari origin yang sama.
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Content-Type-Options': 'nosniff',
        // Mencegah token aktivasi di URL bocor lewat header Referer.
        'Referrer-Policy': 'no-referrer',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      },
    },
    '/api/**': {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  },
})
