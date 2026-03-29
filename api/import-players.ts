export const config = { runtime: 'edge' }

// Leagues tracked by VIZION (API-Football season 2024)
const LEAGUES = [
  [39,  'Premier League'],
  [140, 'La Liga'],
  [78,  'Bundesliga'],
  [135, 'Serie A'],
  [61,  'Ligue 1'],
] as const

// Columns to refresh on each nightly run
interface StatRow {
  appearances:          number
  minutes_played:       number
  goals:                number
  assists:              number
  tackles:              number
  interceptions:        number
  blocks:               number
  key_passes:           number
  pass_completion_rate: number
}

function safeInt(v: unknown): number {
  const n = parseInt(String(v ?? '0'), 10)
  return isNaN(n) ? 0 : n
}

function safeFloat(v: unknown): number {
  const n = parseFloat(String(v ?? '0'))
  return isNaN(n) ? 0 : n
}

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const cronSecret   = process.env.CRON_SECRET
  const authHeader   = request.headers.get('Authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const apiKey       = process.env.API_FOOTBALL_KEY
  const supabaseUrl  = process.env.VITE_SUPABASE_URL
  const supabaseKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!apiKey || !supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Missing server env vars' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let playersUpdated = 0

  for (const [leagueId] of LEAGUES) {
    try {
      const res = await fetch(
        `https://v3.football.api-sports.io/players?league=${leagueId}&season=2024&page=1`,
        { headers: { 'x-apisports-key': apiKey } }
      )
      if (!res.ok) continue

      const data = (await res.json()) as { response?: unknown[] }

      for (const item of data.response ?? []) {
        const { player, statistics } = item as {
          player: { name?: string; age?: number }
          statistics?: { games?: Record<string, unknown>; goals?: Record<string, unknown>; passes?: Record<string, unknown>; tackles?: Record<string, unknown>; team?: { name?: string } }[]
        }

        const s = statistics?.[0]
        if (!s) continue

        const appearances = safeInt(s.games?.appearances)
        if (appearances < 3) continue

        const row: StatRow = {
          appearances,
          minutes_played:       safeInt(s.games?.minutes),
          goals:                safeInt(s.goals?.total),
          assists:              safeInt(s.goals?.assists),
          tackles:              safeInt(s.tackles?.total),
          interceptions:        safeInt(s.tackles?.interceptions),
          blocks:               safeInt(s.tackles?.blocks),
          key_passes:           safeInt(s.passes?.key),
          pass_completion_rate: safeFloat(s.passes?.accuracy),
        }

        const name     = encodeURIComponent(player.name ?? '')
        const team     = encodeURIComponent(s.team?.name ?? '')
        const patchRes = await fetch(
          `${supabaseUrl}/rest/v1/players?name=eq.${name}&team=eq.${team}`,
          {
            method:  'PATCH',
            headers: {
              apikey:          supabaseKey,
              Authorization:   `Bearer ${supabaseKey}`,
              'Content-Type':  'application/json',
              Prefer:          'return=minimal',
            },
            body: JSON.stringify(row),
          }
        )

        if (patchRes.ok) playersUpdated++
      }
    } catch {
      // skip league on error — continue to next
    }
  }

  return new Response(JSON.stringify({ players_updated: playersUpdated }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
