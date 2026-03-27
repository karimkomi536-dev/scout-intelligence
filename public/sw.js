// VIZION Service Worker — v1
// Strategies:
//   • Static assets  → CacheFirst
//   • Supabase API   → NetworkFirst (player detail limited to 20 entries)
//   • Navigation     → NetworkFirst + SPA fallback to index.html

const VERSION       = 'vizion-v1'
const STATIC_CACHE  = `${VERSION}-static`
const API_CACHE     = `${VERSION}-api`
const MAX_PLAYER_ENTRIES = 20

// ── Install: pre-cache app shell ────────────────────────────────────────────

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(['/index.html']))
      .then(() => self.skipWaiting())
  )
})

// ── Activate: remove old caches ─────────────────────────────────────────────

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => !k.startsWith(VERSION))
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// ── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle GET
  if (request.method !== 'GET') return

  // Skip chrome-extension and non-http(s) schemes
  if (!url.protocol.startsWith('http')) return

  // 1. CacheFirst — static assets (JS, CSS, fonts, images, icons)
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // 2. NetworkFirst — Supabase REST / auth
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(supabaseNetworkFirst(request, url))
    return
  }

  // 3. NetworkFirst + SPA fallback — navigation
  if (request.mode === 'navigate') {
    event.respondWith(navigateWithFallback(request))
    return
  }
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function isStaticAsset(pathname) {
  return /\.(js|mjs|css|svg|png|jpg|jpeg|webp|gif|ico|woff2?|ttf|eot)$/.test(pathname)
}

function isPlayerDetailRequest(urlStr) {
  return urlStr.includes('/rest/v1/players') && urlStr.includes('id=eq.')
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch (err) {
    return new Response('Asset unavailable offline', { status: 503 })
  }
}

async function supabaseNetworkFirst(request, url) {
  const cache = await caches.open(API_CACHE)
  try {
    const response = await fetch(request)
    if (response.ok) {
      if (isPlayerDetailRequest(url.href)) {
        // Enforce 20-entry LRU for individual player responses
        await limitedCachePut(cache, request, response.clone())
      } else {
        // Cache other Supabase responses (player list, shortlists, etc.)
        cache.put(request, response.clone())
      }
    }
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function limitedCachePut(cache, request, response) {
  const allKeys = await cache.keys()
  const playerKeys = allKeys.filter(k => isPlayerDetailRequest(k.url))
  if (playerKeys.length >= MAX_PLAYER_ENTRIES) {
    // Evict oldest (first in list — insertion order)
    await cache.delete(playerKeys[0])
  }
  await cache.put(request, response)
}

async function navigateWithFallback(request) {
  try {
    const response = await fetch(request)
    // Cache a fresh copy of index.html for offline
    if (response.ok && new URL(request.url).pathname === '/') {
      const cache = await caches.open(STATIC_CACHE)
      cache.put('/index.html', response.clone())
    }
    return response
  } catch {
    const cached = await caches.match('/index.html')
    if (cached) return cached
    return new Response('<h1>VIZION — Offline</h1><p>Reconnectez-vous pour accéder à l\'app.</p>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    })
  }
}
