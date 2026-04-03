export const config = { runtime: 'edge' }

// ── Helpers ────────────────────────────────────────────────────────────────────

async function logCron(
  supabaseUrl: string,
  supabaseKey: string,
  status: 'success' | 'error',
  message: string,
  players_updated = 0,
): Promise<void> {
  await fetch(`${supabaseUrl}/rest/v1/cron_logs`, {
    method:  'POST',
    headers: {
      apikey:         supabaseKey,
      Authorization:  `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer:         'return=minimal',
    },
    body: JSON.stringify({ type: 'snapshot', status, message, players_updated }),
  })
}

// ── Handler ────────────────────────────────────────────────────────────────────

export default async function handler(request: Request) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('Authorization')
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const appUrl      = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.APP_URL

  if (!supabaseUrl || !supabaseKey || !appUrl) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // Trigger the player update pipeline (fetches fresh data + recalculates scores)
    const res = await fetch(`https://${appUrl}/api/cron/update-players`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      const text = await res.text()
      await logCron(supabaseUrl, supabaseKey, 'error',
        `update-players returned ${res.status}: ${text}`)

      return new Response(JSON.stringify({ ok: false, error: text }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { players_updated } = (await res.json()) as { players_updated: number }

    await logCron(
      supabaseUrl, supabaseKey,
      'success',
      `Snapshot complete — ${players_updated} players updated`,
      players_updated,
    )

    return new Response(
      JSON.stringify({ ok: true, players_updated }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = (err as Error).message
    await logCron(supabaseUrl, supabaseKey, 'error', message)

    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
