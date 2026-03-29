export const config = { runtime: 'edge' }

// ── Types ─────────────────────────────────────────────────────────────────────

interface FixtureRow {
  api_fixture_id: number
  date:           string
  home_team:      string
  away_team:      string
  competition:    string
  status:         string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function logCron(
  supabaseUrl: string,
  supabaseKey: string,
  type: string,
  status: 'success' | 'error',
  message: string,
): Promise<void> {
  await fetch(`${supabaseUrl}/rest/v1/cron_logs`, {
    method:  'POST',
    headers: {
      apikey:         supabaseKey,
      Authorization:  `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer:         'return=minimal',
    },
    body: JSON.stringify({ type, status, message, players_updated: 0 }),
  })
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

// ── Handler ────────────────────────────────────────────────────────────────────

export default async function handler(request: Request) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const cronSecret  = process.env.CRON_SECRET
  const authHeader  = request.headers.get('Authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const apiKey      = process.env.API_FOOTBALL_KEY
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!apiKey || !supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const date = todayISO()

  try {
    // Fetch today's fixtures from API-Football
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures?date=${date}`,
      { headers: { 'x-apisports-key': apiKey } }
    )

    if (!res.ok) {
      const text = await res.text()
      await logCron(supabaseUrl, supabaseKey, 'update-fixtures', 'error',
        `API-Football error ${res.status}: ${text}`)
      return new Response(JSON.stringify({ ok: false }), { status: 500 })
    }

    const data = (await res.json()) as {
      response?: {
        fixture: { id: number; date: string; status: { short: string } }
        league:  { name: string }
        teams:   { home: { name: string }; away: { name: string } }
      }[]
    }

    const rows: FixtureRow[] = (data.response ?? []).map(f => ({
      api_fixture_id: f.fixture.id,
      date:           f.fixture.date,
      home_team:      f.teams.home.name,
      away_team:      f.teams.away.name,
      competition:    f.league.name,
      status:         f.fixture.status.short,
    }))

    if (rows.length === 0) {
      await logCron(supabaseUrl, supabaseKey, 'update-fixtures', 'success',
        `No fixtures found for ${date}`)
      return new Response(JSON.stringify({ ok: true, fixtures_upserted: 0 }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    }

    // Upsert into fixtures table (conflict on api_fixture_id)
    const upsertRes = await fetch(`${supabaseUrl}/rest/v1/fixtures`, {
      method:  'POST',
      headers: {
        apikey:         supabaseKey,
        Authorization:  `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer:         'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows),
    })

    if (!upsertRes.ok) {
      const text = await upsertRes.text()
      await logCron(supabaseUrl, supabaseKey, 'update-fixtures', 'error',
        `Supabase upsert failed: ${text}`)
      return new Response(JSON.stringify({ ok: false }), { status: 500 })
    }

    const message = `Upserted ${rows.length} fixtures for ${date}`
    await logCron(supabaseUrl, supabaseKey, 'update-fixtures', 'success', message)

    return new Response(
      JSON.stringify({ ok: true, fixtures_upserted: rows.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = (err as Error).message
    await logCron(supabaseUrl, supabaseKey, 'update-fixtures', 'error', message)
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
}
