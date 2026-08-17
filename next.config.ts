import type { NextConfig } from "next";

/**
 * Aussy Ontech — Configuração Next.js otimizada para Vercel.
 *
 * - Sem `output: "standalone"` (Vercel builda Next.js nativamente).
 * - Sem `ignoreBuildErrors` (validação TypeScript estrita ativada).
 * - Apenas pacotes server real em `serverExternalPackages`.
 * - Cabeçalhos de segurança completos (CSP, HSTS, Permissions-Policy).
 * - Otimização de imagens com AVIF/WebP.
 */

/** Domínios externos confiáveis usados pelas APIs brasileiras públicas. */
const TRUSTED_API_ORIGINS = [
  'https://apitempo.inmet.gov.br',          // INMET (alertas + estações)
  'https://servicodados.ibge.gov.br',        // IBGE (municípios, malhas)
  'https://www.snirh.gov.br',                // ANA / SNIRH (rios)
  'https://api.snirh.gov.br',                // ANA API v2
  'http://satellite1.cptec.inpe.br',         // CPTEC/INPE (imagens GOES-16)
  'https://gatewayapi.cnpt.em.brapa.gov.br', // CPTEC API gateway
  'https://gateway.brapa.cnpt.embrapa.br',   // Embrapa
  'https://earthquake.usgs.gov',             // USGS (sismos)
  'https://eonet.gsfc.nasa.gov',             // NASA EONET
  'https://api.openweathermap.org',           // OpenWeather (fallback clima)
  'https://nominatim.openstreetmap.org',     // OSM Nominatim (geocode)
  'https://tile.openstreetmap.org',          // OSM tiles (mapas)
  'https://api.whatsapp.com',                // WhatsApp share
  'https://wa.me',                            // WhatsApp short links
];

const nextConfig: NextConfig = {
  // Vercel builda Next.js nativamente — NÃO usar `output: "standalone"` em produção cloud.
  // (Standalone é para Docker/VPS/Caddy; foi removido para compatibilidade com Vercel.)

  // Validação TypeScript ATIVADA em produção — segurança first.
  typescript: {
    ignoreBuildErrors: false,
  },

  // Nota: ESLint é validado via `bun run lint` separadamente (Next 16+ removeu a flag do config).

  reactStrictMode: false,

  // ============ COMPRESSÃO ============
  compress: true,

  // ============ OTIMIZAÇÃO DE IMAGENS ============
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'satellite1.cptec.inpe.br' },
      { protocol: 'http', hostname: 'satellite1.cptec.inpe.br' },
      { protocol: 'https', hostname: 'tile.openstreetmap.org' },
      { protocol: 'https', hostname: 'basemaps.cartocdn.com' },
    ],
    minimumCacheTTL: 600,
  },

  // ============ CABEÇALHOS DE SEGURANÇA (CSP, HSTS, etc) ============
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // HSTS — força HTTPS em produção
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // X-Frame-Options — evita clickjacking
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // X-Content-Type-Options — evita MIME sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Referrer-Policy — controla vazamento de URL
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Permissions-Policy — sensores e geolocalização só same-origin
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(self), microphone=(), camera=(), accelerometer=(self), gyroscope=(self), magnetometer=(self), ambient-light-sensor=(self), payment=()',
          },
          // Cross-Origin isolation — necessário para algumas APIs avançadas
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
          // CSP — permite apenas fontes confiáveis
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Scripts: self + inline (necessário para Next.js) + eval em dev
              process.env.NODE_ENV === 'development'
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
                : "script-src 'self' 'unsafe-inline'",
              // Styles: self + inline (Next.js styled-jsx)
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Imagens: self + dados inline + APIs brasileiras + OSM tiles
              `img-src 'self' data: blob: ${TRUSTED_API_ORIGINS.join(' ')} https://*.tile.openstreetmap.org https://basemaps.cartocdn.com`,
              // Fonts
              "font-src 'self' data: https://fonts.gstatic.com",
              // Conexões (fetch, XHR, WebSocket) — APIs brasileiras confiáveis
              `connect-src 'self' ${TRUSTED_API_ORIGINS.join(' ')} https://*.tile.openstreetmap.org https://basemaps.cartocdn.com wss: ws:`,
              // Frames — apenas mesmo-origin (mapa embed etc)
              "frame-src 'self' https://www.openstreetmap.org",
              // Object/embed — bloqueado
              "object-src 'none'",
              // Base URI
              "base-uri 'self'",
              // Form actions — apenas mesmo-origin
              "form-action 'self'",
              // Manifest
              "manifest-src 'self'",
              // Workers — self
              "worker-src 'self' blob:",
              // Media
              "media-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
      // Service worker — sem cache HTTP para garantir updates
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      // Manifest — cache curto
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
      // Ícones PWA — cache longo
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
