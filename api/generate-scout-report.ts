export const config = { runtime: 'edge' }

import {
  corsHeaders,
  preflightResponse,
  checkRateLimit,
  getClientIp,
  rateLimitedResponse,
} from './cors.js'

export default async function handler(request: Request) {
  const origin = request.headers.get('origin') ?? undefined

  if (request.method === 'OPTIONS') {
    return preflightResponse(origin)
  }

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const ip = getClientIp(request)
  const { allowed, remaining, resetAt } = checkRateLimit(ip)
  if (!allowed) {
    return rateLimitedResponse(resetAt, origin)
  }

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY missing' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } }
      )
    }

    const body = await request.json()
    const player = body?.player

    if (!player) {
      return new Response(
        JSON.stringify({ error: 'player data missing in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } }
      )
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-opus-4-5',
        max_tokens: 800,
        messages: [{
          role:    'user',
          content: `Tu es un expert scout football. Génère un rapport de scouting professionnel en français (200 mots max) pour ce joueur : ${JSON.stringify(player)}`,
        }],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'Anthropic error', details: data }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } }
      )
    }

    const report = data.content?.[0]?.text || ''

    return new Response(
      JSON.stringify({ report }),
      {
        status: 200,
        headers: {
          'Content-Type':           'application/json',
          'X-RateLimit-Remaining':  String(remaining),
          ...corsHeaders(origin),
        },
      }
    )

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) } }
    )
  }
}
