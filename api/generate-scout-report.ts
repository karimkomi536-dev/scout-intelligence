/**
 * api/generate-scout-report.ts — Vercel Edge Function
 *
 * POST { player: Player, language: 'fr' }
 * → calls Anthropic claude-sonnet-4-20250514
 * → returns { report: string }
 *
 * ANTHROPIC_API_KEY is a server-side env var — never exposed in the client bundle.
 */

export const config = { runtime: 'edge' }

// ── Prompt helpers ─────────────────────────────────────────────────────────

function formatPlayerData(player: Record<string, unknown>): string {
  return JSON.stringify(
    {
      name:             player.name,
      age:              player.age,
      position:         player.primary_position,
      team:             player.team,
      competition:      player.competition,
      nationality:      player.nationality,
      foot:             player.foot,
      scout_score:      player.scout_score,
      scout_label:      player.scout_label,
      stats: {
        goals:                 player.goals,
        assists:               player.assists,
        xg:                    player.xg,
        xa:                    player.xa,
        minutes_played:        player.minutes_played,
        appearances:           player.appearances,
        pass_completion_rate:  player.pass_completion_rate,
        progressive_passes:    player.progressive_passes,
        key_passes:            player.key_passes,
        shot_creating_actions: player.shot_creating_actions,
        tackles:               player.tackles,
        interceptions:         player.interceptions,
        pressures:             player.pressures,
        pressure_success_rate: player.pressure_success_rate,
        blocks:                player.blocks,
        clearances:            player.clearances,
      },
      individual_stats: player.individual_stats,
    },
    null,
    2,
  )
}

const SYSTEM_PROMPT = `Tu es un expert scout football avec 20 ans d'expérience en Europe (Premier League, La Liga, Ligue 1, Bundesliga, Serie A). Tu génères des rapports de scouting professionnels concis en français, basés sur les données statistiques fournies.

Structure de ton rapport :
1. **Résumé exécutif** (2-3 phrases) — verdict général et positionnement
2. **Points forts** (3 bullet points max) — basés sur les stats les plus élevées
3. **Points d'amélioration** (2 bullet points max) — axes de progression identifiés
4. **Recommandation** (1 phrase) — acheter / surveiller / passer

Règles :
- Sois factuel, précis et direct
- Cite des chiffres précis tirés des données
- Adapte le ton au poste (gardien ≠ attaquant)
- Maximum 250 mots
- Pas d'intro générique ("En tant que scout...")`

// ── Handler ────────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  console.log('ANTHROPIC_API_KEY present:', !!process.env.ANTHROPIC_API_KEY)
  console.log('Key prefix:', process.env.ANTHROPIC_API_KEY?.substring(0, 10))

  // CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  let body: { player?: Record<string, unknown>; language?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const { player } = body
  if (!player || !player.name) {
    return new Response(JSON.stringify({ error: 'Missing player data' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const userMessage = `Génère un rapport de scouting professionnel pour ce joueur :\n\n${formatPlayerData(player)}`

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userMessage }],
    }),
  })

  if (!anthropicRes.ok) {
    const err = await anthropicRes.text()
    return new Response(JSON.stringify({ error: 'Anthropic API error', detail: err }), {
      status: anthropicRes.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const data = await anthropicRes.json() as {
    content: Array<{ type: string; text: string }>
  }
  const report = data.content.find(c => c.type === 'text')?.text ?? ''

  return new Response(JSON.stringify({ report }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
