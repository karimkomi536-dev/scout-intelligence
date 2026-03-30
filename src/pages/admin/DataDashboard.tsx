import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, RefreshCw, Play } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

interface LeagueStats {
  competition:     string
  total:           number
  withMarketValue: number
  withXg:          number
}

interface CronLog {
  id:              string
  type:            string
  status:          'success' | 'error'
  message:         string | null
  players_updated: number
  created_at:      string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LEAGUE_TARGETS: Record<string, number> = {
  'Premier League': 500,
  'La Liga':        500,
  'Bundesliga':     450,
  'Serie A':        500,
  'Ligue 1':        450,
  'Championship':   600,
  'Ligue 2':        450,
}
const DEFAULT_TARGET = 300

const TYPE_LABEL: Record<string, string> = {
  'update-players':  'Joueurs',
  'update-fixtures': 'Fixtures',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function pct(num: number, den: number): number {
  return den === 0 ? 0 : Math.min(100, Math.round((num / den) * 100))
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontSize: 13, fontWeight: 800, color: 'var(--text-muted)',
      letterSpacing: '0.12em', textTransform: 'uppercase',
      margin: '0 0 16px',
    }}>
      {children}
    </h2>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background:   'rgba(255,255,255,0.03)',
      border:       '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12,
      overflow:     'hidden',
      ...style,
    }}>
      {children}
    </div>
  )
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const p = pct(value, max)
  const color = p >= 80 ? '#00C896' : p >= 50 ? '#4D7FFF' : '#F5A623'
  return (
    <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ width: `${p}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 600ms ease' }} />
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DataDashboard() {
  const [leagues,      setLeagues]      = useState<LeagueStats[]>([])
  const [logs,         setLogs]         = useState<CronLog[]>([])
  const [loadingData,  setLoadingData]  = useState(true)
  const [loadingLogs,  setLoadingLogs]  = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [triggering,   setTriggering]   = useState(false)
  const [triggerMsg,   setTriggerMsg]   = useState<{ ok: boolean; text: string } | null>(null)

  // ── Fetch player stats ───────────────────────────────────────────────────

  async function fetchPlayerStats() {
    setLoadingData(true)
    const { data, error: err } = await supabase
      .from('players')
      .select('competition, market_value_eur, xg')

    if (err) {
      setError(err.message)
      setLoadingData(false)
      return
    }

    // Aggregate by competition
    const map = new Map<string, LeagueStats>()
    for (const row of (data ?? [])) {
      const comp = row.competition ?? 'Inconnu'
      const cur  = map.get(comp) ?? { competition: comp, total: 0, withMarketValue: 0, withXg: 0 }
      cur.total++
      if (row.market_value_eur != null) cur.withMarketValue++
      if ((row.xg ?? 0) > 0)           cur.withXg++
      map.set(comp, cur)
    }

    setLeagues(
      [...map.values()].sort((a, b) => b.total - a.total),
    )
    setLoadingData(false)
  }

  // ── Fetch cron logs ──────────────────────────────────────────────────────

  async function fetchLogs() {
    setLoadingLogs(true)
    const { data, error: err } = await supabase
      .from('cron_logs')
      .select('id, type, status, message, players_updated, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (err) {
      setError(err.message)
    } else {
      setLogs((data ?? []) as CronLog[])
    }
    setLoadingLogs(false)
  }

  // ── Trigger pipeline manually ────────────────────────────────────────────

  async function triggerPipeline() {
    setTriggering(true)
    setTriggerMsg(null)
    try {
      const res = await fetch('/api/cron/update-players', { method: 'POST' })
      if (res.ok) {
        setTriggerMsg({ ok: true, text: 'Pipeline déclenché — vérifiez les logs dans ~2 min.' })
        setTimeout(fetchLogs, 5000)
      } else {
        const body = await res.json().catch(() => ({}))
        setTriggerMsg({ ok: false, text: body.error ?? `Erreur HTTP ${res.status} — CRON_SECRET requis.` })
      }
    } catch {
      setTriggerMsg({ ok: false, text: 'Impossible de joindre /api/cron/update-players.' })
    }
    setTriggering(false)
  }

  useEffect(() => {
    fetchPlayerStats()
    fetchLogs()
  }, [])

  // ── Global stats ─────────────────────────────────────────────────────────

  const totalPlayers   = leagues.reduce((s, l) => s + l.total, 0)
  const totalMV        = leagues.reduce((s, l) => s + l.withMarketValue, 0)
  const totalXg        = leagues.reduce((s, l) => s + l.withXg, 0)
  const pctMV          = pct(totalMV, totalPlayers)
  const pctXg          = pct(totalXg, totalPlayers)
  const lastRun        = logs.find(l => l.type === 'update-players')

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px' }}>
          Monitoring données
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Couverture et qualité des données par ligue · Admin uniquement
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 13, marginBottom: 24,
        }}>
          {error}
        </div>
      )}

      {/* ── SECTION JOUEURS ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 40 }}>
        <SectionTitle>Joueurs</SectionTitle>

        {/* Global badges */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          {[
            { label: 'Total joueurs',          value: totalPlayers.toString() },
            { label: '% valeur marchande',      value: loadingData ? '…' : `${pctMV}%` },
            { label: '% xG renseigné',          value: loadingData ? '…' : `${pctXg}%` },
            { label: 'Dernière MAJ pipeline',   value: lastRun ? formatDate(lastRun.created_at) : '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: '12px 16px', minWidth: 140,
            }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {label}
              </p>
              <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Per-league table */}
        <Card>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 160px',
            padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            <span>Ligue</span>
            <span style={{ textAlign: 'right' }}>Joueurs</span>
            <span style={{ textAlign: 'right' }}>MV%</span>
            <span style={{ textAlign: 'right' }}>xG%</span>
            <span style={{ paddingLeft: 16 }}>Couverture</span>
          </div>

          {loadingData && (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Chargement…
            </div>
          )}

          {!loadingData && leagues.length === 0 && (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Aucun joueur en base.
            </div>
          )}

          {!loadingData && leagues.map((l, i) => {
            const target  = LEAGUE_TARGETS[l.competition] ?? DEFAULT_TARGET
            const covPct  = pct(l.total, target)
            const mvPct   = pct(l.withMarketValue, l.total)
            const xgPct   = pct(l.withXg, l.total)

            return (
              <div
                key={l.competition}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px 160px',
                  padding: '14px 20px', alignItems: 'center',
                  borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {l.competition}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>
                  {l.total}<span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>/{target}</span>
                </span>
                <span style={{ fontSize: 13, color: mvPct >= 50 ? 'var(--text-primary)' : '#F5A623', textAlign: 'right', fontWeight: 600 }}>
                  {mvPct}%
                </span>
                <span style={{ fontSize: 13, color: xgPct >= 50 ? 'var(--text-primary)' : '#F5A623', textAlign: 'right', fontWeight: 600 }}>
                  {xgPct}%
                </span>
                <div style={{ paddingLeft: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{covPct}%</span>
                  </div>
                  <ProgressBar value={l.total} max={target} />
                </div>
              </div>
            )
          })}
        </Card>
      </div>

      {/* ── SECTION PIPELINE ────────────────────────────────────────────── */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <SectionTitle>Pipeline</SectionTitle>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { fetchLogs(); fetchPlayerStats() }}
              disabled={loadingLogs}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 8, padding: '8px 14px',
                color: 'var(--text-muted)', fontSize: 13, fontWeight: 600,
                cursor: loadingLogs ? 'not-allowed' : 'pointer', opacity: loadingLogs ? 0.5 : 1,
              }}
            >
              <RefreshCw size={13} style={{ animation: loadingLogs ? 'spin 1s linear infinite' : 'none' }} />
              Actualiser
            </button>
            <button
              onClick={triggerPipeline}
              disabled={triggering}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: triggering ? 'rgba(77,127,255,0.08)' : 'rgba(77,127,255,0.14)',
                border: '1px solid rgba(77,127,255,0.30)',
                borderRadius: 8, padding: '8px 14px',
                color: '#4D7FFF', fontSize: 13, fontWeight: 600,
                cursor: triggering ? 'not-allowed' : 'pointer', opacity: triggering ? 0.6 : 1,
              }}
            >
              <Play size={12} fill="#4D7FFF" />
              {triggering ? 'En cours…' : 'Lancer manuellement'}
            </button>
          </div>
        </div>

        {triggerMsg && (
          <div style={{
            background:   triggerMsg.ok ? 'rgba(0,200,150,0.08)' : 'rgba(239,68,68,0.08)',
            border:       `1px solid ${triggerMsg.ok ? 'rgba(0,200,150,0.25)' : 'rgba(239,68,68,0.25)'}`,
            borderRadius: 10, padding: '10px 16px',
            color:        triggerMsg.ok ? '#00C896' : '#f87171',
            fontSize:     13, marginBottom: 12,
          }}>
            {triggerMsg.text}
          </div>
        )}

        <Card>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '120px 90px 1fr 100px 160px',
            padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
            <span>Type</span>
            <span>Statut</span>
            <span>Message</span>
            <span style={{ textAlign: 'right' }}>Joueurs</span>
            <span style={{ textAlign: 'right' }}>Date</span>
          </div>

          {loadingLogs && (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Chargement…
            </div>
          )}

          {!loadingLogs && logs.length === 0 && (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Aucun log. Les crons s'exécutent à 3h et 4h UTC.
            </div>
          )}

          {!loadingLogs && logs.map((log, i) => (
            <div
              key={log.id}
              style={{
                display: 'grid', gridTemplateColumns: '120px 90px 1fr 100px 160px',
                padding: '14px 20px', alignItems: 'center',
                borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
              }}
            >
              <span style={{
                fontSize: 12, fontWeight: 700, color: 'var(--text-primary)',
                background: 'rgba(255,255,255,0.06)', borderRadius: 6,
                padding: '3px 8px', width: 'fit-content',
              }}>
                {TYPE_LABEL[log.type] ?? log.type}
              </span>

              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700,
                color: log.status === 'success' ? '#00C896' : '#f87171' }}>
                {log.status === 'success' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                {log.status === 'success' ? 'OK' : 'Erreur'}
              </span>

              <span style={{ fontSize: 12, color: 'var(--text-muted)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {log.message ?? '—'}
              </span>

              <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right',
                color: log.players_updated > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {log.players_updated > 0 ? `+${log.players_updated}` : '—'}
              </span>

              <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
                {formatDate(log.created_at)}
              </span>
            </div>
          ))}
        </Card>
      </div>

      {/* ── SECTION COUVERTURE ──────────────────────────────────────────── */}
      <div style={{ marginBottom: 40 }}>
        <SectionTitle>Couverture par ligue</SectionTitle>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 12,
        }}>
          {loadingData && (
            <div style={{ padding: '24px', color: 'var(--text-muted)', fontSize: 13 }}>Chargement…</div>
          )}

          {!loadingData && leagues.map(l => {
            const target = LEAGUE_TARGETS[l.competition] ?? DEFAULT_TARGET
            const covPct = pct(l.total, target)
            const color  = covPct >= 80 ? '#00C896' : covPct >= 50 ? '#4D7FFF' : '#F5A623'

            return (
              <div key={l.competition} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, padding: '16px 18px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    {l.competition}
                  </p>
                  <span style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>
                    {covPct}%
                  </span>
                </div>
                <ProgressBar value={l.total} max={target} />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '8px 0 0' }}>
                  {l.total} / {target} joueurs actifs
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
