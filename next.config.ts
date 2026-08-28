import type { NextConfig } from "next";

/**
 * Aussy Ontech — configuração Next.js para Vercel.
 *
 * As integrações INMET/NASA/USGS/CPTEC/INPE/IBGE/Nominatim são acessadas
 * server-side pelas rotas `/api`. A CSP do navegador, portanto, autoriza apenas
 * origens realmente usadas pelo cliente. Hoje a única origem externa necessária
 * para fetch/imagem no browser é o servidor raster canônico do OpenStreetMap.
 */

const OSM_TILE_ORIGIN = 'https://tile.openstreetmap.org';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },

  reactStrictMode: false,
  compress: true,

  // O projeto atual não usa next/image para imagens remotas. Manter somente
  // formatos locais evita uma allowlist remota sem consumidor real.
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 600,
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Mantém somente o origin como Referer cross-origin — necessário para identificar uso web dos tiles OSM.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            // Câmera liberada apenas para o próprio app: necessária ao LED traseiro local.
            // Microfone, pagamentos e origens externas continuam bloqueados.
            value: 'geolocation=(self), microphone=(), camera=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self), ambient-light-sensor=(self), payment=()',
          },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              process.env.NODE_ENV === 'development'
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
                : "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              `img-src 'self' data: blob: ${OSM_TILE_ORIGIN}`,
              "font-src 'self' data:",
              `connect-src 'self' ${OSM_TILE_ORIGIN}`,
              "frame-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "manifest-src 'self'",
              "worker-src 'self' blob:",
              "media-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          // APIs são superfície operacional, não conteúdo para mecanismos de busca.
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive, nosnippet' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
      {
        source: '/icon-:size(\\d+).:ext(png|svg)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
