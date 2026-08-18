// Aussy Ontech Service Worker v8 — cold boot offline + cache seguro + recovery

const CACHE_VERSION = 'aussy-v8';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const EMERGENCY_CACHE = `${CACHE_VERSION}-emergency`;
const SATELLITE_CACHE = `${CACHE_VERSION}-satellites`;
const OSM_TILES_CACHE = 'aussy-v2-osm-tiles'; // nome estável: preserva tiles já visualizados entre upgrades
const OSM_TILE_META_CACHE = 'aussy-osm-tile-meta-v1';
const OSM_MIN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

// Apenas recursos nacionais/estáticos. Dados dependentes de coordenadas são
// preparados separadamente após uma posição real do dispositivo.
const EMERGENCY_PRECACHE = [
  '/api/emergency/contacts',
  '/api/emergency/first-aid',
  '/api/satellites/tle?group=starlink&limit=20',
  '/api/satellites/tle?group=iridium&limit=20',
  '/api/satellites/tle?group=weather&limit=20',
  '/api/satellites/tle?group=gnss&limit=20',
  '/api/inmet/alerts',
  '/api/cemaden/alerts',
  '/api/cptec/satellite',
  '/api/defesacivil/alertas',
];

function locationPrecacheUrls(lat, lon) {
  const safeLat = Number(lat);
  const safeLon = Number(lon);
  if (!Number.isFinite(safeLat) || !Number.isFinite(safeLon) || safeLat < -90 || safeLat > 90 || safeLon < -180 || safeLon > 180) return [];

  const qLat = safeLat.toFixed(5);
  const qLon = safeLon.toFixed(5);
  return [
    `/api/coverage/towers?lat=${qLat}&lon=${qLon}&radius=30`,
    `/api/queimadas/focos?lat=${qLat}&lon=${qLon}&raio=200`,
    `/api/earthquakes?lat=${qLat}&lon=${qLon}&raio=500&mag=2.5&dias=7`,
    `/api/eonet?lat=${qLat}&lon=${qLon}&raio=2000&dias=30`,
    `/api/cptec/forecast?lat=${qLat}&lon=${qLon}`,
    `/api/inmet/stations?lat=${qLat}&lon=${qLon}&raio=300`,
    `/api/ana/rios?lat=${qLat}&lon=${qLon}&raio=500`,
    `/api/ibge/municipios?lat=${qLat}&lon=${qLon}&raio=100&limit=15`,
    `/api/geocode?lat=${qLat}&lon=${qLon}`,
  ];
}

function isCacheableResponse(response) {
  return Boolean(response) && (response.ok || response.type === 'opaque');
}

async function responseIsLiveAndUsable(response) {
  if (!response || !response.ok) return false;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return true;

  try {
    const payload = await response.clone().json();
    if (!payload || typeof payload !== 'object') return true;
    if (payload.error || payload.erro) return false;
    if (payload.offline === true) return false;
    if (payload.dataQuality === 'unavailable') return false;

    if (payload.online === false) {
      const safeOfflineQuality = new Set([
        'official-channels-only',
        'reference-location-only',
        'official-portal',
      ]);
      if (!safeOfflineQuality.has(payload.dataQuality)) return false;
    }

    return true;
  } catch {
    return true;
  }
}

async function putSafe(cacheName, request, response) {
  if (!isCacheableResponse(response)) return false;
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

  const urls = [...new Set([...APP_SHELL.filter((url) => url !== '/'), ...nextAssets])];
  const results = await Promise.allSettled(urls.map(async (url) => {
    const response = await fetch(url, { cache: 'reload' });
    if (!isCacheableResponse(response)) throw new Error(`HTTP ${response.status}`);
    await staticCache.put(url, response.clone());
    return url;
  }));

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') succeeded += 1;
    else failed.push(urls[index]);
  });

  return { ok: failed.length === 0 && succeeded > 0, total: urls.length + 1, succeeded, failed };
}

async function cacheResourceList(urls, cacheName) {
  const cache = await caches.open(cacheName);
  const failed = [];
  let succeeded = 0;

  const results = await Promise.allSettled(urls.map(async (url) => {
    const response = await fetch(url, { cache: 'no-store' });
    if (!(await responseIsLiveAndUsable(response))) throw new Error(`Recurso degradado: ${url}`);
    await cache.put(url, response.clone());
    return url;
  }));

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') succeeded += 1;
    else failed.push(urls[index]);
  });

  return { ok: failed.length === 0, total: urls.length, succeeded, failed };
}

async function precacheEmergency() {
  return cacheResourceList(EMERGENCY_PRECACHE, EMERGENCY_CACHE);
}

async function precacheLocation(lat, lon) {
  const urls = locationPrecacheUrls(lat, lon);
  if (!urls.length) return { ok: false, total: 0, succeeded: 0, failed: ['invalid-location'] };
  return cacheResourceList(urls, RUNTIME_CACHE);
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
  return { shell: Boolean(root) && hasNextAsset, emergency: Boolean(emergency) };
}

function cachedResponseWithHeaders(response, extra = {}) {
  if (!response || response.type === 'opaque') return response;
  const headers = new Headers(response.headers);
  headers.set('X-Aussy-Cached', 'true');
  for (const [key, value] of Object.entries(extra)) headers.set(key, String(value));
  return new Response(response.clone().body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(payload, status = 503) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Aussy-Offline': 'true',
      'Cache-Control': 'no-store',
    },
  });
}

function offlineApiResponse(url) {
  const path = url.pathname;
  const now = new Date().toISOString();

  if (path === '/api/network/status') return jsonResponse({ online: false, latency: null, externalIp: null, isp: null, country: null, geo: null, error: 'offline', offline: true, timestamp: now });

  if (path.startsWith('/api/coverage/towers')) {
    const lat = Number(url.searchParams.get('lat') || 0);
    const lon = Number(url.searchParams.get('lon') || 0);
    const radius = Number(url.searchParams.get('radius') || 30);
    return jsonResponse({
      observer: { lat, lon, radius }, timestamp: now,
      source: 'offline — sem cópia local para esta consulta',
      dataQuality: { towers: 'unavailable', wifiPoints: 'unavailable' },
      wifiPoints: [], wifiTotal: 0, towers: [], towersTotal: 0, byOperator: [],
      note: 'Sem dados de cobertura em cache para estas coordenadas.', error: 'offline', offline: true,
    });
  }

  if (path.startsWith('/api/inmet/alerts')) return jsonResponse({ alerts: [], total: 0, cached: false, error: 'offline', offline: true, fetchedAt: now });
  if (path.startsWith('/api/inmet/stations')) return jsonResponse({ online: false, fonte: 'offline — sem cache', total_estacoes: 0, proximas: [], atualizado_em: now, error: 'offline', offline: true });
  if (path.startsWith('/api/cemaden')) return jsonResponse({ alerts: [], total: 0, error: 'offline', offline: true, dataQuality: 'unavailable', fetchedAt: now });
  if (path.startsWith('/api/queimadas')) return jsonResponse({ focos: [], total: 0, error: 'offline', offline: true, dataQuality: 'unavailable', fetchedAt: now });
  if (path.startsWith('/api/earthquakes')) return jsonResponse({ events: [], total: 0, error: 'offline', offline: true, dataQuality: 'unavailable', queriedAt: now });
  if (path.startsWith('/api/eonet')) return jsonResponse({ events: [], total: 0, error: 'offline', offline: true, queriedAt: now });
  if (path.startsWith('/api/cptec/forecast')) return jsonResponse({ city: null, days: [], total: 0, error: 'offline', offline: true, dataQuality: 'unavailable', queriedAt: now });
  if (path.startsWith('/api/cptec/satellite')) return jsonResponse({ online: false, dataQuality: 'official-portal', fonte: 'CPTEC/INPE', imagens: [], pagina_base: 'https://sigma.cptec.inpe.br/', aviso: 'Sem conexão para abrir o portal oficial.', offline: true });
  if (path.startsWith('/api/ana')) return jsonResponse({ online: false, dataQuality: 'reference-location-only', total: 0, estacoes: [], atualizado_em: null, error: 'offline', offline: true });
  if (path.startsWith('/api/ibge')) return jsonResponse({ online: false, municipios: [], total: 0, atualizado_em: now, error: 'offline', offline: true });
  if (path.startsWith('/api/defesacivil')) return jsonResponse({ online: false, dataQuality: 'official-channels-only', emergencia_numero: '199', alertas: [], contatos: [], error: 'offline', offline: true });
  if (path.startsWith('/api/geocode')) return jsonResponse({ city: null, region: null, country: null, error: 'offline', offline: true });

  return jsonResponse({ error: 'offline', cached: false, offline: true });
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

async function osmTileCache(request) {
  const tileCache = await caches.open(OSM_TILES_CACHE);
  const metaCache = await caches.open(OSM_TILE_META_CACHE);
  const cached = await tileCache.match(request);
  let cachedAt = 0;

  try {
    const metadata = await metaCache.match(request);
    if (metadata) cachedAt = Number(await metadata.text()) || 0;
  } catch {}

  const freshEnough = cached && cachedAt > 0 && (Date.now() - cachedAt) < OSM_MIN_TTL_MS;
  if (freshEnough) return cached;

  try {
    // Fetch sem no-store/no-cache: o navegador pode honrar Cache-Control/Etag do OSM.
    const response = await fetch(request);
    if (isCacheableResponse(response)) {
      await tileCache.put(request, response.clone());
      await metaCache.put(request, new Response(String(Date.now()), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }));
    }
    return response;
  } catch {
    // Fora da rede, um tile previamente visualizado continua disponível mesmo
    // depois da janela de revalidação. Nunca buscamos tiles não visualizados.
    if (cached) return cached;
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

async function networkFirst(request, cacheName, fallback) {
  try {
    const response = await fetch(request);
    const usable = await responseIsLiveAndUsable(response);

    if (usable) {
      await putSafe(cacheName, request, response);
      return response;
    }

    const cached = await caches.match(request);
    if (cached) {
      return cachedResponseWithHeaders(cached, {
        'X-Aussy-Offline': 'true',
        'X-Aussy-Upstream-Degraded': 'true',
      });
    }

    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cachedResponseWithHeaders(cached, { 'X-Aussy-Offline': 'true' });
    if (fallback) return fallback();
    return offlineApiResponse(new URL(request.url));
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

  return jsonResponse({
    error: 'offline',
    message: 'Sem conexão e sem cópia local para este recurso.',
    emergencyNumbers: [
      { number: '192', name: 'SAMU' },
      { number: '190', name: 'Polícia Militar' },
      { number: '193', name: 'Bombeiros' },
      { number: '199', name: 'Defesa Civil' },
    ],
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const [shell, emergency] = await Promise.all([precacheShell(), precacheEmergency()]);
    console.log('[SW] Install v8', { shell, emergency });
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const readiness = await currentCachesReady();
    const keys = await caches.keys();

    if (readiness.shell && readiness.emergency) {
      await Promise.all(
        keys
          .filter((k) => k.startsWith('aussy-v') && !k.startsWith(CACHE_VERSION) && k !== OSM_TILES_CACHE)
          .map((k) => caches.delete(k))
      );
    } else {
      console.warn('[SW] v8 parcial; caches anteriores preservados', readiness);
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

  if (url.hostname === 'tile.openstreetmap.org') {
    event.respondWith(osmTileCache(request));
    return;
  }

  if (url.hostname.includes('cptec.inpe.br') || url.hostname.includes('satellite1.cptec')) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

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
    event.respondWith(networkFirst(request, SATELLITE_CACHE, () => {
      if (url.pathname.includes('/passes')) return jsonResponse({ passes: [], total: 0, error: 'offline', offline: true, fallback: true });
      return jsonResponse({ satellites: [], total: 0, visible: 0, error: 'offline', offline: true, fallback: true });
    }));
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE, () => offlineApiResponse(url)));
    return;
  }

  if (url.origin === self.location.origin) event.respondWith(cacheFirst(request, STATIC_CACHE));
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
    event.waitUntil((async () => reply(event, await precacheShell()))());
    return;
  }

  if (data.type === 'PRECACHE_EMERGENCY') {
    event.waitUntil((async () => reply(event, await precacheEmergency()))());
    return;
  }

  if (data.type === 'PRECACHE_LOCATION') {
    event.waitUntil((async () => reply(event, await precacheLocation(data.lat, data.lon)))());
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
  if (event.tag === 'aussy-refresh') event.waitUntil(precacheEmergency());
});

console.log('[SW] Aussy Ontech v8 — cold boot + posição real + last-known-good cache + OSM passivo');
