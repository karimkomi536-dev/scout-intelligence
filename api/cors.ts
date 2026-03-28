// ── CORS + Rate Limiting helpers for VIZION Edge Functions ────────────────────

const ALLOWED_ORIGIN = 'https://scout-intelligence-ten.vercel.app'

/** Returns strict CORS headers scoped to the production origin. */
export function corsHeaders(origin?: string): Record<string, string> {
  // In local dev (origin undefined or localhost) keep the real origin header
  // so the browser CORS pre-flight succeeds. In production only allow the
  // exact deployment URL.
  const allowedOrigin =
    origin && origin.startsWith('http://localhost') ? origin : ALLOWED_ORIGIN

  return {
    'Access-Control-Allow-Origin':  allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

/** Returns a full OPTIONS pre-flight Response with strict CORS headers. */
export function preflightResponse(origin?: string): Response {
  return new Response(null, { status: 204, headers: corsHeaders(origin) })
}

// ── In-memory rate limiter ────────────────────────────────────────────────────
// NOTE: Vercel Edge isolates are not shared across CDN nodes, so this limiter
// is per-isolate, not globally distributed. For true global rate-limiting use
// Vercel KV or Upstash Redis. This is sufficient to stop naive abuse.

const RATE_LIMIT_MAX    = 10   // max requests per window per IP
const RATE_LIMIT_WINDOW = 60_000  // 60 seconds

interface Bucket { count: number; resetAt: number }
const _store = new Map<string, Bucket>()

/**
 * Check whether the given IP is within the rate limit.
 * Returns { allowed, remaining, resetAt }.
 */
export function checkRateLimit(ip: string): {
  allowed: boolean
  remaining: number
  resetAt: number
} {
  const now = Date.now()
  let bucket = _store.get(ip)

  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 1, resetAt: now + RATE_LIMIT_WINDOW }
    _store.set(ip, bucket)

    // Prune stale entries if the store grows too large
    if (_store.size > 2000) {
      for (const [k, v] of _store) {
        if (now > v.resetAt) _store.delete(k)
      }
    }

    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt: bucket.resetAt }
  }

  bucket.count++
  const remaining = Math.max(0, RATE_LIMIT_MAX - bucket.count)
  return {
    allowed:   bucket.count <= RATE_LIMIT_MAX,
    remaining,
    resetAt:   bucket.resetAt,
  }
}

/**
 * Extract the client IP from common Vercel / CDN forwarded headers.
 * Falls back to a static string so the limiter never crashes.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  )
}

/**
 * Returns a 429 Response with Retry-After and rate-limit headers.
 * Include CORS headers so the browser receives the response cleanly.
 */
export function rateLimitedResponse(resetAt: number, origin?: string): Response {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000)
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please wait before retrying.' }),
    {
      status: 429,
      headers: {
        'Content-Type':       'application/json',
        'Retry-After':        String(retryAfter),
        'X-RateLimit-Limit':  String(RATE_LIMIT_MAX),
        'X-RateLimit-Reset':  String(Math.ceil(resetAt / 1000)),
        ...corsHeaders(origin),
      },
    }
  )
}
