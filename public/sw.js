// Aussy Ontech Service Worker v7 — operação offline real e robusta
// v7: adicionado cache INMET estações, IBGE municípios, ANA rios, CPTEC satélite, Defesa Civil

const CACHE_VERSION = 'aussy-v7';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const EMERGENCY_CACHE = `${CACHE_VERSION}-emergency`;
const SATELLITE_CACHE = `${CACHE_VERSION}-satellites`;
const OSM_TILES_CACHE = 'aussy-v2-osm-tiles'; // nome mantido para não invalidar cache existente
const INMET_CACHE = `${CACHE_VERSION}-inmet`;
const CEMADEN_CACHE = `${CACHE_VERSION}-cemaden`;
const QUEIMADAS_CACHE = `${CACHE_VERSION}-queimadas`;
const EARTHQUAKES_CACHE = `${CACHE_VERSION}-earthquakes`;
const EONET_CACHE = `${CACHE_VERSION}-eonet`;
const CPTEC_CACHE = `${CACHE_VERSION}-cptec`;
const GEOCODE_CACHE = `${CACHE_VERSION}-geocode`;
const IBGE_CACHE = `${CACHE_VERSION}-ibge`;
const ANA_CACHE = `${CACHE_VERSION}-ana`;
const DEFESACIVIL_CACHE = `${CACHE_VERSION}-defesacivil`;
const CPTEC_SAT_IMAGES_CACHE = `${CACHE_VERSION}-cptec-images`;

// Recursos essenciais para boot offline (app shell)
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon-32.png',
];

// Dados críticos de emergência (pré-cachear no install)
const EMERGENCY_PRECACHE = [
  '/api/emergency/contacts',
  '/api/emergency/first-aid',
  '/api/coverage/towers',
  '/api/satellites/tle?group=starlink&limit=20',
  '/api/inmet/alerts',
  '/api/cemaden/alerts',
  '/api/queimadas/focos?lat=-15.7801&lon=-47.9292&raio=200',
  '/api/earthquakes?lat=-15.7801&lon=-47.9292&raio=500&mag=2.5&dias=7',
  '/api/eonet?lat=-15.7801&lon=-47.9292&raio=2000&dias=30',
  '/api/cptec/forecast?lat=-15.7801&lon=-47.9292',
  '/api/cptec/satellite',
  '/api/inmet/stations?lat=-15.7801&lon=-47.9292&raio=300',
  '/api/ana/rios?lat=-15.7801&lon=-47.9292&raio=500',
  '/api/ibge/municipios?lat=-15.7801&lon=-47.9292&raio=100&limit=15',
  '/api/defesacivil/alertas',
  '/api/geocode?lat=-15.7801&lon=-47.9292',
];

// ============= INSTALL: pré-cachear tudo essencial =============
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const staticCache = await caches.open(STATIC_CACHE);
      const emergCache = await caches.open(EMERGENCY_CACHE);

      // App shell: tolerante a falhas individuais
      await Promise.allSettled(
        APP_SHELL.map(async (url) => {
          try {
            const res = await fetch(url, { cache: 'reload' });
            if (res.ok) await staticCache.put(url, res);
          } catch (e) {
            console.warn('[SW] Falha pré-cache:', url, e.message);
          }
        })
      );

      // Emergência: cada um é crítico, mas não bloqueia install
      await Promise.allSettled(
        EMERGENCY_PRECACHE.map(async (url) => {
          try {
            const res = await fetch(url);
            if (res.ok) await emergCache.put(url, res);
          } catch (e) {
            console.warn('[SW] Falha pré-cache emergência:', url);
          }
        })
      );

      console.log('[SW] Instalado e pré-cacheado');
    })()
  );
});

// ============= ACTIVATE: limpar caches antigos =============
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
      console.log('[SW] Ativado e controlando clientes');
    })()
  );
});

// ============= FETCH: estratégias inteligentes =============
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Só processa GET
  if (request.method !== 'GET') return;

  // Ignora non-http (chrome-extension, data:, blob:)
  if (!url.protocol.startsWith('http')) return;

  // Ignora HMR/Next internals no dev
  if (url.pathname.startsWith('/_next/webpack-hmr')) return;

  // ---------- 0. TILES OpenStreetMap — cache-first (offline maps) ----------
  if (url.hostname === 'tile.openstreetmap.org' || url.hostname === 'a.tile.openstreetmap.org' || url.hostname === 'b.tile.openstreetmap.org' || url.hostname === 'c.tile.openstreetmap.org') {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request, { headers: { 'User-Agent': 'AussyOntech/1.0 (PWA offline emergency app)' } });
          if (res.ok) {
            const clone = res.clone();
            const cache = await caches.open(OSM_TILES_CACHE);
            await cache.put(request, clone);
          }
          return res;
        } catch (e) {
          return cached || new Response('', { status: 504 });
        }
      })()
    );
    return;
  }

  // ---------- 0b. Alertas INMET — network-first, cache 30min ----------
  if (url.pathname.startsWith('/api/inmet') || url.hostname.includes('inmet')) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res.ok) {
            const clone = res.clone();
            const cache = await caches.open(INMET_CACHE);
            await cache.put(request, clone);
          }
          return res;
        } catch (e) {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(
            JSON.stringify({ error: 'offline', alerts: [], cached: false }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }
      })()
    );
    return;
  }

  // ---------- 0c. CEMADEN (desastres naturais) — network-first, cache 30min ----------
  if (url.pathname.startsWith('/api/cemaden')) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res.ok) {
            const clone = res.clone();
            const cache = await caches.open(CEMADEN_CACHE);
            await cache.put(request, clone);
          }
          return res;
        } catch (e) {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(
            JSON.stringify({ error: 'offline', alerts: [], cached: false }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }
      })()
    );
    return;
  }

  // ---------- 0d. Queimadas INPE — network-first, cache 3h ----------
  if (url.pathname.startsWith('/api/queimadas')) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res.ok) {
            const clone = res.clone();
            const cache = await caches.open(QUEIMADAS_CACHE);
            await cache.put(request, clone);
          }
          return res;
        } catch (e) {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(
            JSON.stringify({ error: 'offline', focos: [], total: 0 }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }
      })()
    );
    return;
  }

  // ---------- 0e. USGS Earthquakes — network-first, cache 5min ----------
  if (url.pathname.startsWith('/api/earthquakes')) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res.ok) {
            const clone = res.clone();
            const cache = await caches.open(EARTHQUAKES_CACHE);
            await cache.put(request, clone);
          }
          return res;
        } catch (e) {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(
            JSON.stringify({ error: 'offline', events: [], total: 0, offline: true }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }
      })()
    );
    return;
  }

  // ---------- 0f. NASA EONET — network-first, cache 30min ----------
  if (url.pathname.startsWith('/api/eonet')) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res.ok) {
            const clone = res.clone();
            const cache = await caches.open(EONET_CACHE);
            await cache.put(request, clone);
          }
          return res;
        } catch (e) {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(
            JSON.stringify({ error: 'offline', events: [], total: 0, offline: true }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }
      })()
    );
    return;
  }

  // ---------- 0g. CPTEC Forecast — network-first, cache 1h ----------
  if (url.pathname.startsWith('/api/cptec')) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res.ok) {
            const clone = res.clone();
            const cache = await caches.open(CPTEC_CACHE);
            await cache.put(request, clone);
          }
          return res;
        } catch (e) {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(
            JSON.stringify({ error: 'offline', days: [], offline: true }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }
      })()
    );
    return;
  }

  // ---------- 0h. Nominatim Geocode — network-first, cache 24h ----------
  if (url.pathname.startsWith('/api/geocode')) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res.ok) {
            const clone = res.clone();
            const cache = await caches.open(GEOCODE_CACHE);
            await cache.put(request, clone);
          }
          return res;
        } catch (e) {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(
            JSON.stringify({ error: 'offline', city: null, offline: true }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }
      })()
    );
    return;
  }

  // ---------- 0i. IBGE (municípios) — stale-while-revalidate, cache 30 dias ----------
  if (url.pathname.startsWith('/api/ibge')) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        const fetchPromise = fetch(request)
          .then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(IBGE_CACHE).then((cache) => cache.put(request, clone));
            }
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })()
    );
    return;
  }

  // ---------- 0j. ANA (rios) — network-first, cache 1h ----------
  if (url.pathname.startsWith('/api/ana')) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res.ok) {
            const clone = res.clone();
            const cache = await caches.open(ANA_CACHE);
            await cache.put(request, clone);
          }
          return res;
        } catch (e) {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(
            JSON.stringify({ error: 'offline', estacoes: [], total: 0, offline: true }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }
      })()
    );
    return;
  }

  // ---------- 0k. Defesa Civil (SEDEC) — network-first, cache 30min ----------
  if (url.pathname.startsWith('/api/defesacivil')) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res.ok) {
            const clone = res.clone();
            const cache = await caches.open(DEFESACIVIL_CACHE);
            await cache.put(request, clone);
          }
          return res;
        } catch (e) {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(
            JSON.stringify({ error: 'offline', alertas: [], contatos: [], offline: true }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }
      })()
    );
    return;
  }

  // ---------- 0l. Imagens de satélite CPTEC (GOES-16) — cache-first 10min ----------
  if (url.hostname.includes('cptec.inpe.br') || url.hostname.includes('satellite1.cptec')) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) {
          // Revalida em background
          fetch(request)
            .then((res) => {
              if (res.ok) {
                const clone = res.clone();
                caches.open(CPTEC_SAT_IMAGES_CACHE).then((cache) => cache.put(request, clone));
              }
            })
            .catch(() => {});
          return cached;
        }
        try {
          const res = await fetch(request);
          if (res.ok) {
            const clone = res.clone();
            const cache = await caches.open(CPTEC_SAT_IMAGES_CACHE);
            await cache.put(request, clone);
          }
          return res;
        } catch (e) {
          return cached || new Response('', { status: 504 });
        }
      })()
    );
    return;
  }

  // ---------- 1. APIs de EMERGÊNCIA — sempre retorna algo ----------
  if (url.pathname.startsWith('/api/emergency')) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res.ok) {
            const clone = res.clone();
            const cache = await caches.open(EMERGENCY_CACHE);
            await cache.put(request, clone);
          }
          return res;
        } catch (e) {
          // Offline: tenta cache
          const cached = await caches.match(request);
          if (cached) return cached;
          // Última tentativa: cache "list all" para emergência
          const cache = await caches.open(EMERGENCY_CACHE);
          const keys = await cache.keys();
          for (const k of keys) {
            if (k.url.includes(url.pathname)) {
              return await cache.match(k);
            }
          }
          return new Response(
            JSON.stringify({
              error: 'offline',
              message: 'Sem conexão. Dados de emergência não estão em cache.',
              emergencyNumbers: [
                { number: '192', name: 'SAMU' },
                { number: '190', name: 'Polícia' },
                { number: '193', name: 'Bombeiros' },
              ],
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }
      })()
    );
    return;
  }

  // ---------- 2. API de SATÉLITES — network-first, cache long-lived ----------
  if (url.pathname.startsWith('/api/satellites')) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res.ok) {
            const clone = res.clone();
            const cache = await caches.open(SATELLITE_CACHE);
            await cache.put(request, clone);
          }
          return res;
        } catch (e) {
          const cached = await caches.match(request);
          if (cached) {
            // Adiciona header indicando que veio do cache
            const headers = new Headers(cached.headers);
            headers.set('X-Aussy-Cached', 'true');
            headers.set('X-Aussy-Cached-Date', cached.headers.get('date') || 'unknown');
            return new Response(cached.body, { status: cached.status, headers });
          }
          return new Response(
            JSON.stringify({
              error: 'offline',
              message: 'Dados de satélites indisponíveis offline nesta sessão. Reconecte para atualizar TLEs.',
              satellites: [],
              total: 0,
              visible: 0,
              fallback: true,
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }
      })()
    );
    return;
  }

  // ---------- 3. Outras APIs — network-first, fallback cache ----------
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res.ok) {
            const clone = res.clone();
            const cache = await caches.open(RUNTIME_CACHE);
            await cache.put(request, clone);
          }
          return res;
        } catch (e) {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response(
            JSON.stringify({ error: 'offline', cached: false }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }
      })()
    );
    return;
  }

  // ---------- 4. Navegação (HTML) — network-first, fallback app shell ----------
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          if (res.ok) {
            const clone = res.clone();
            const cache = await caches.open(STATIC_CACHE);
            await cache.put(request, clone);
          }
          return res;
        } catch (e) {
          // Tentar URL exata primeiro, depois "/" (app shell)
          const cached = await caches.match(request);
          if (cached) return cached;
          const rootCached = await caches.match('/');
          if (rootCached) {
            // Adiciona header para indicar offline
            const headers = new Headers(rootCached.headers);
            headers.set('X-Aussy-Offline', 'true');
            return new Response(rootCached.body, { status: 200, headers });
          }
          // Página offline fallback
          return new Response(
            `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Aussy Ontech — Offline</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0e14;color:#e5e7eb;font-family:system-ui,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem}
.c{max-width:400px;text-align:center}
.logo{width:80px;height:80px;margin:0 auto 1rem;border-radius:16px;border:2px solid #10b981;display:flex;align-items:center;justify-content:center;font-weight:800;color:#10b981;font-size:32px}
h1{font-size:1.25rem;margin-bottom:.5rem;color:#10b981}
p{font-size:.875rem;color:#9ca3af;margin-bottom:1.5rem;line-height:1.5}
.e{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);border-radius:8px;padding:.75rem;margin:.5rem 0;font-size:.875rem;color:#10b981}
.e strong{color:#fff}
button{background:#10b981;color:#0a0e14;border:none;padding:.75rem 1.5rem;border-radius:8px;font-weight:600;font-size:.875rem;cursor:pointer;margin-top:.5rem}
</style>
</head><body><div class="c">
<div class="logo">A</div>
<h1>Aussy Ontech — Modo Offline</h1>
<p>Você está sem conexão. O app precisa ser carregado online UMA VEZ para funcionar offline depois.</p>
<div class="e"><strong>192</strong> SAMU · <strong>190</strong> Polícia · <strong>193</strong> Bombeiros</div>
<button onclick="location.reload()">Tentar novamente</button>
</div></body></html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }
      })()
    );
    return;
  }

  // ---------- 5. Estáticos (JS, CSS, fonts, imagens) — cache-first ----------
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const res = await fetch(request);
        if (res.ok && (res.type === 'basic' || res.type === 'cors')) {
          const clone = res.clone();
          const cache = await caches.open(STATIC_CACHE);
          await cache.put(request, clone);
        }
        return res;
      } catch (e) {
        return cached || new Response('', { status: 504 });
      }
    })()
  );
});

// ============= MESSAGE: comandos do cliente =============
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
  if (data.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
  }
  if (data.type === 'PRECACHE_EMERGENCY') {
    // Cliente pode forçar re-pré-cache dos dados de emergência
    caches.open(EMERGENCY_CACHE).then((cache) =>
      Promise.allSettled(
        EMERGENCY_PRECACHE.map(async (url) => {
          try {
            const res = await fetch(url);
            if (res.ok) await cache.put(url, res);
          } catch (e) {}
        })
      )
    );
  }
});

// ============= PERIODIC SYNC: atualizar dados críticos =============
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'aussy-refresh') {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(EMERGENCY_CACHE);
        await Promise.allSettled(
          EMERGENCY_PRECACHE.map(async (url) => {
            try {
              const res = await fetch(url);
              if (res.ok) await cache.put(url, res);
            } catch (e) {}
          })
        );
      })()
    );
  }
});

console.log('[SW] Aussy Ontech v7 carregado — offline-first para o Brasil');
