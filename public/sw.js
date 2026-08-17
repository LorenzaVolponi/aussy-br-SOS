// Aussy Ontech Service Worker v8 — boot offline verificável e recuperação de rede

const CACHE_VERSION = 'aussy-v8';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const EMERGENCY_CACHE = `${CACHE_VERSION}-emergency`;
const SATELLITE_CACHE = `${CACHE_VERSION}-satellites`;
const OSM_TILES_CACHE = 'aussy-v2-osm-tiles'; // estável entre versões para preservar mapas baixados

const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon-32.png',
  '/logo.svg',
];

const EMERGENCY_PRECACHE = [
  '/api/emergency/contacts',
  '/api/emergency/first-aid',
  '/api/coverage/towers',
  '/api/satellites/tle?group=starlink&limit=20',
  '/api/satellites/tle?group=iridium&limit=20',
  '/api/satellites/tle?group=weather&limit=20',
  '/api/satellites/tle?group=gnss&limit=20',
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

function isCacheable(response) {
  return !!response && (response.ok || response.type === 'opaque');
}

async function putSafe(cacheName, request, response) {
  if (!isCacheable(response)) return false;
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
    return true;
  } catch (error) {
    console.warn('[SW] Falha ao gravar cache:', cacheName, error);
    return false;
  }
}

function extractNextAssets(html) {
  const assets = new Set();
  const pattern = /(?:src|href)=["']([^"']*\/_next\/static\/[^"']+)["']/g;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    try {
      const url = new URL(match[1], self.location.origin);
      if (url.origin === self.location.origin) assets.add(url.pathname + url.search);
    } catch {}
  }
  return [...assets];
}

async function precacheShell() {
  const staticCache = await caches.open(STATIC_CACHE);
  const failed = [];
  let succeeded = 0;
  let nextAssets = [];

  try {
    const rootResponse = await fetch('/', { cache: 'reload' });
    if (!rootResponse.ok) throw new Error(`HTTP ${rootResponse.status}`);
    const html = await rootResponse.clone().text();
    nextAssets = extractNextAssets(html);
    await staticCache.put('/', rootResponse.clone());
    succeeded += 1;
  } catch (error) {
    failed.push('/');
    console.warn('[SW] Falha ao preparar HTML principal:', error);
  }

  const shellUrls = [...new Set([...APP_SHELL.filter((url) => url !== '/'), ...nextAssets])];
  for (const url of shellUrls) {
    try {
      const response = await fetch(url, { cache: 'reload' });
      if (isCacheable(response)) {
        await staticCache.put(url, response.clone());
        succeeded += 1;
      } else {
        failed.push(url);
      }
    } catch {
      failed.push(url);
    }
  }

  return {
    ok: failed.length === 0 && succeeded > 0,
    total: shellUrls.length + 1,
    succeeded,
    failed,
  };
}

async function precacheEmergency() {
  const cache = await caches.open(EMERGENCY_CACHE);
  const failed = [];
  let succeeded = 0;

  for (const url of EMERGENCY_PRECACHE) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) {
        await cache.put(url, response.clone());
        succeeded += 1;
      } else {
        failed.push(url);
      }
    } catch {
      failed.push(url);
    }
  }

  return {
    ok: failed.length === 0,
    total: EMERGENCY_PRECACHE.length,
    succeeded,
    failed,
  };
}

async function currentCachesReady() {
  const staticCache = await caches.open(STATIC_CACHE);
  const emergencyCache = await caches.open(EMERGENCY_CACHE);
  const root = await staticCache.match('/');
  const staticKeys = await staticCache.keys();
  const hasNextAsset = staticKeys.some((request) => {
    try {
      return new URL(request.url).pathname.startsWith('/_next/static/');
    } catch {
      return false;
    }
  });
  const emergency = await emergencyCache.match('/api/emergency/contacts');
  return { shell: !!root && hasNextAsset, emergency: !!emergency };
}

function cachedResponseWithHeaders(response, extra = {}) {
  if (!response || response.type === 'opaque') return response;
  const headers = new Headers(response.headers);
  headers.set('X-Aussy-Cached', 'true');
  for (const [key, value] of Object.entries(extra)) headers.set(key, value);
  return new Response(response.clone().body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    await putSafe(cacheName, request, response);
    return response;
  } catch {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

async function networkFirst(request, cacheName, fallback) {
  try {
    const response = await fetch(request);
    if (response.ok) await putSafe(cacheName, request, response);
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cachedResponseWithHeaders(cached, { 'X-Aussy-Offline': 'true' });
    if (fallback) return fallback();
    return new Response(JSON.stringify({ error: 'offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'X-Aussy-Offline': 'true' },
    });
  }
}

async function emergencyFallback(request) {
  const exact = await caches.match(request);
  if (exact) return cachedResponseWithHeaders(exact, { 'X-Aussy-Offline': 'true' });

  const pathname = new URL(request.url).pathname;
  const cache = await caches.open(EMERGENCY_CACHE);
  for (const key of await cache.keys()) {
    if (new URL(key.url).pathname === pathname) {
      const cached = await cache.match(key);
      if (cached) return cachedResponseWithHeaders(cached, { 'X-Aussy-Offline': 'true' });
    }
  }

  return new Response(JSON.stringify({
    error: 'offline',
    message: 'Sem conexão e sem cópia local para este recurso.',
    emergencyNumbers: [
      { number: '192', name: 'SAMU' },
      { number: '190', name: 'Polícia' },
      { number: '193', name: 'Bombeiros' },
      { number: '199', name: 'Defesa Civil' },
    ],
  }), {
    status: 503,
    headers: { 'Content-Type': 'application/json', 'X-Aussy-Offline': 'true' },
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const [shell, emergency] = await Promise.all([
      precacheShell(),
      precacheEmergency(),
    ]);
    console.log('[SW] Install v8', { shell, emergency });
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const readiness = await currentCachesReady();
    const keys = await caches.keys();

    // Só remove versões anteriores quando a nova versão consegue iniciar offline
    // E possui ao menos o contato de emergência básico. Caso contrário, mantém
    // a versão anterior como rede de segurança.
    if (readiness.shell && readiness.emergency) {
      await Promise.all(
        keys
          .filter((k) => k.startsWith('aussy-v') && !k.startsWith(CACHE_VERSION) && k !== OSM_TILES_CACHE)
          .map((k) => caches.delete(k))
      );
    } else {
      console.warn('[SW] v8 ativado parcialmente; caches anteriores preservados', readiness);
    }

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;
  if (url.pathname.startsWith('/_next/webpack-hmr')) return;

  // Tiles OpenStreetMap: cache-first e sem headers proibidos pelo navegador.
  if (
    url.hostname === 'tile.openstreetmap.org' ||
    url.hostname === 'a.tile.openstreetmap.org' ||
    url.hostname === 'b.tile.openstreetmap.org' ||
    url.hostname === 'c.tile.openstreetmap.org'
  ) {
    event.respondWith(cacheFirst(request, OSM_TILES_CACHE));
    return;
  }

  // Imagens externas CPTEC/INPE: cache-first; respostas opacas também são cacheáveis.
  if (url.hostname.includes('cptec.inpe.br') || url.hostname.includes('satellite1.cptec')) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  // Navegação: busca versão nova online; offline usa a URL exata ou o app shell.
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) await putSafe(STATIC_CACHE, request, response);
        return response;
      } catch {
        const exact = await caches.match(request);
        if (exact) return cachedResponseWithHeaders(exact, { 'X-Aussy-Offline': 'true' });
        const root = await caches.match('/');
        if (root) return cachedResponseWithHeaders(root, { 'X-Aussy-Offline': 'true' });

        return new Response(
          `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aussy Ontech — Offline</title><style>*{box-sizing:border-box}body{margin:0;background:#0a0e14;color:#e5e7eb;font-family:system-ui,sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px}.c{max-width:430px;text-align:center}.n{font-size:28px;font-weight:800;color:#10b981}.e{margin:20px 0;padding:14px;border:1px solid #10b98155;border-radius:12px;background:#10b98112}button{border:0;border-radius:10px;padding:12px 18px;background:#10b981;color:#07120f;font-weight:800}</style></head><body><main class="c"><div class="n">Aussy Ontech</div><p>Sem conexão e o app shell completo ainda não está disponível neste dispositivo.</p><div class="e"><strong>192</strong> SAMU · <strong>190</strong> Polícia · <strong>193</strong> Bombeiros · <strong>199</strong> Defesa Civil</div><button onclick="location.reload()">Tentar novamente</button></main></body></html>`,
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Aussy-Offline': 'true' } }
        );
      }
    })());
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith('/api/emergency')) {
    event.respondWith(networkFirst(request, EMERGENCY_CACHE, () => emergencyFallback(request)));
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith('/api/satellites')) {
    event.respondWith(networkFirst(request, SATELLITE_CACHE, () => new Response(JSON.stringify({
      error: 'offline',
      satellites: [],
      total: 0,
      visible: 0,
      fallback: true,
      message: 'Sem TLE cacheado para esta consulta.',
    }), { status: 503, headers: { 'Content-Type': 'application/json', 'X-Aussy-Offline': 'true' } })));
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  // Assets locais, inclusive chunks JS/CSS/fontes do Next: cache-first.
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  }
});

function reply(event, payload) {
  try {
    if (event.ports && event.ports[0]) event.ports[0].postMessage(payload);
  } catch {}
}

self.addEventListener('message', (event) => {
  const data = event.data || {};

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'PRECACHE_SHELL') {
    event.waitUntil((async () => {
      const report = await precacheShell();
      reply(event, report);
    })());
    return;
  }

  if (data.type === 'PRECACHE_EMERGENCY') {
    event.waitUntil((async () => {
      const report = await precacheEmergency();
      reply(event, report);
    })());
    return;
  }

  if (data.type === 'CLEAR_CACHE') {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith('aussy-')).map((key) => caches.delete(key)));
      reply(event, { ok: true });
    })());
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'aussy-refresh') {
    event.waitUntil(precacheEmergency());
  }
});

console.log('[SW] Aussy Ontech v8 — offline shell + recovery');
