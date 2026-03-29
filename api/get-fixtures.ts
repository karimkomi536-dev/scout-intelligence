export const config = { runtime: 'edge' }

import { corsHeaders, preflightResponse, getClientIp, checkRateLimit, rateLimitedResponse } from './cors.js'
import { TEAM_IDS } from '../src/data/team-mappings.js'

// ── Types ─────────────────────────────────────────────────────────────────────

interface FDTeam {
  id:        number
  name:      string
  shortName: string
}

interface FDMatch {
  id:          number
  utcDate:     string
  status:      string
  competition: { name: string }
  homeTeam:    FDTeam
  awayTeam:    FDTeam
}

export interface FixtureResult {
  id:          number
  utcDate:     string
  competition: string
  homeTeam:    { id: number; name: string; shortName: string }
  awayTeam:    { id: number; name: string; shortName: string }
  status:      string
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(request: Request) {
  const origin = request.headers.get('origin') ?? undefined

  if (request.method === 'OPTIONS') return preflightResponse(origin)
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Rate limit per IP
  const ip = getClientIp(request)
  const { allowed, remaining, resetAt } = checkRateLimit(ip)
  if (!allowed) return rateLimitedResponse(resetAt, origin)

  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'FOOTBALL_DATA_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    })
  }

  // Parse ?team= query param
  const url      = new URL(request.url)
  const teamName = url.searchParams.get('team') ?? ''

  if (!teamName) {
    return new Response(JSON.stringify({ error: 'Missing ?team= parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    })
  }

  const teamId = TEAM_IDS[teamName]
  if (!teamId) {
    // Team not in mapping — return empty gracefully (no error)
    return new Response(JSON.stringify({ teamId: null, teamName, fixtures: [] }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600',
        'X-RateLimit-Remaining': String(remaining),
        ...corsHeaders(origin),
      },
    })
  }

  try {
    const res = await fetch(
      `https://api.football-data.org/v4/teams/${teamId}/matches?status=SCHEDULED&limit=5`,
      { headers: { 'X-Auth-Token': apiKey } }
    )

    if (!res.ok) {
      const text = await res.text()
      return new Response(JSON.stringify({ error: `football-data.org error ${res.status}`, details: text }), {
        status: res.status === 429 ? 429 : 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    const data = (await res.json()) as { matches?: FDMatch[] }

    const fixtures: FixtureResult[] = (data.matches ?? []).slice(0, 5).map(m => ({
      id:          m.id,
      utcDate:     m.utcDate,
      competition: m.competition.name,
      homeTeam:    { id: m.homeTeam.id, name: m.homeTeam.name, shortName: m.homeTeam.shortName },
      awayTeam:    { id: m.awayTeam.id, name: m.awayTeam.name, shortName: m.awayTeam.shortName },
      status:      m.status,
    }))

    return new Response(
      JSON.stringify({ teamId, teamName, fixtures }),
      {
        status: 200,
        headers: {
          'Content-Type':         'application/json',
          // 1-hour CDN cache — fixtures don't change minute-by-minute
          'Cache-Control':        'public, s-maxage=3600',
          'X-RateLimit-Remaining': String(remaining),
          ...corsHeaders(origin),
        },
      }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
    })
  }
}
