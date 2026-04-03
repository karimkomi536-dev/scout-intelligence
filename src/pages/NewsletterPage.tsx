import { useState } from 'react'
import { Loader2, Copy, Check, Newspaper, RefreshCw, Star, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'

// ── Types ─────────────────────────────────────────────────────────────────────

interface NewsletterPlayer {
  id:               string
  name:             string
  team:             string
  primary_position: string
  scout_score:      number
  scout_label:      string
  competition:      string
  age?:             number
}

interface NewsletterData {
  topPlayers:  NewsletterPlayer[]
  u23Players:  NewsletterPlayer[]
  generatedAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const LABEL_COLOR: Record<string, string> = {
  'ELITE':        '#00C896',
  'TOP PROSPECT': '#4D7FFF',
  'INTERESTING':  '#F5A623',
  'TO MONITOR':   '#9B6DFF',
  'LOW PRIORITY': '#6b7280',
}

function scoreColor(score: number): string {
  if (score >= 80) return '#00C896'
  if (score >= 65) return '#4D7FFF'
  if (score >= 50) return '#F5A623'
  return '#6b7280'
}

function buildPlainText(data: NewsletterData): string {
  const lines: string[] = [
    `VIZION — Digest Scouting`,
    `Généré le ${data.generatedAt}`,
    '',
    '═══════════════════════════════════',
    '🔥 TOP JOUEURS CETTE SEMAINE',
    '═══════════════════════════════════',
  ]
  data.topPlayers.forEach((p, i) => {
    lines.push(`${i + 1}. ${p.name} (${p.team}) — Score: ${p.scout_score} — ${p.primary_position} — ${p.competition}`)
  })
  lines.push('')
  lines.push('═══════════════════════════════════')
  lines.push('🌟 PÉPITES U23')
  lines.push('═══════════════════════════════════')
  data.u23Players.forEach((p, i) => {
    lines.push(`${i + 1}. ${p.name} (${p.team}) — Score: ${p.scout_score}${p.age ? ` — ${p.age} ans` : ''} — ${p.competition}`)
  })
  return lines.join('\n')
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NewsletterPage() {
  const [data,    setData]    = useState<NewsletterData | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied,  setCopied]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const { showToast } = useToast()

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const [topRes, u23Res] = await Promise.all([
        supabase
          .from('players')
          .select('id, name, team, primary_position, scout_score, scout_label, competition')
          .order('scout_score', { ascending: false })
          .limit(5),
        supabase
          .from('players')
          .select('id, name, team, primary_position, scout_score, scout_label, competition, age')
          .eq('is_u23', true)
          .order('scout_score', { ascending: false })
          .limit(3),
      ])

      if (topRes.error) throw topRes.error
      if (u23Res.error) throw u23Res.error

      setData({
        topPlayers:  (topRes.data ?? []) as NewsletterPlayer[],
        u23Players:  (u23Res.data ?? []) as NewsletterPlayer[],
        generatedAt: new Date().toLocaleDateString('fr-FR', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        }),
      })
      showToast('Newsletter générée', 'success')
    } catch (e) {
      console.error('Newsletter generation failed:', e)
      setError('Erreur lors de la génération. Vérifiez la connexion Supabase.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    if (!data) return
    try {
      await navigator.clipboard.writeText(buildPlainText(data))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback — select a textarea
    }
  }

  return (
    <div style={{ color: 'var(--text-primary)', paddingBottom: 48 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(77,127,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Newspaper size={18} color="#4D7FFF" />
          </div>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Newsletter Scouting</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              Digest hebdomadaire généré depuis votre base joueurs
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {data && (
            <button
              onClick={copyToClipboard}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          6,
                background:   copied ? 'rgba(0,200,150,0.15)' : 'rgba(255,255,255,0.06)',
                color:        copied ? '#00C896' : 'var(--text-secondary)',
                border:       `1px solid ${copied ? 'rgba(0,200,150,0.30)' : 'var(--border)'}`,
                borderRadius: 8,
                padding:      '8px 14px',
                fontSize:     13,
                fontWeight:   600,
                cursor:       'pointer',
                transition:   'all 200ms',
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copié !' : 'Copier'}
            </button>
          )}

          <button
            onClick={generate}
            disabled={loading}
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          6,
              background:   loading ? 'rgba(77,127,255,0.5)' : '#4D7FFF',
              color:        'white',
              border:       'none',
              borderRadius: 8,
              padding:      '8px 16px',
              fontSize:     13,
              fontWeight:   600,
              cursor:       loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading
              ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Génération…</>
              : <><RefreshCw size={14} /> {data ? 'Regénérer' : 'Générer le digest'}</>
            }
          </button>
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          color: '#ef4444', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {!data && !loading && !error && (
        <div style={{
          textAlign: 'center', padding: '80px 24px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed rgba(255,255,255,0.10)',
          borderRadius: 16,
        }}>
          <Newspaper size={40} color="rgba(255,255,255,0.15)" style={{ marginBottom: 16 }} />
          <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>Aucun digest généré</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Cliquez sur "Générer le digest" pour créer un résumé depuis votre base joueurs.
          </p>
        </div>
      )}

      {/* ── Loading skeleton ───────────────────────────────────────────────── */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2].map(i => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.04)', borderRadius: 12,
              padding: 24, height: 180,
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      )}

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {data && !loading && (
        <>
          {/* Generated at */}
          <p style={{
            fontSize: 12, color: 'var(--text-muted)',
            marginBottom: 20, fontStyle: 'italic',
          }}>
            Généré le {data.generatedAt} · {data.topPlayers.length + data.u23Players.length} joueurs
          </p>

          {/* Top players */}
          <Section
            icon={<Star size={16} color="#F5A623" />}
            title="Top joueurs cette semaine"
            color="#F5A623"
            players={data.topPlayers}
            showLabel
          />

          {/* U23 */}
          <Section
            icon={<Zap size={16} color="#00C896" />}
            title="Pépites U23"
            color="#00C896"
            players={data.u23Players}
            showAge
          />

          {data.u23Players.length === 0 && (
            <div style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: 12,
              padding: '20px 24px', marginTop: 8,
              border: '1px solid var(--border)',
              color: 'var(--text-muted)', fontSize: 13,
            }}>
              Aucun joueur U23 en base. Assurez-vous que la colonne <code>is_u23</code> est correctement peuplée.
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}

// ── Section sub-component ─────────────────────────────────────────────────────

function Section({
  icon, title, color, players, showLabel = false, showAge = false,
}: {
  icon:       React.ReactNode
  title:      string
  color:      string
  players:    NewsletterPlayer[]
  showLabel?: boolean
  showAge?:   boolean
}) {
  if (players.length === 0) return null

  return (
    <div style={{
      background:   'rgba(255,255,255,0.03)',
      border:       '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14,
      padding:      24,
      marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        {icon}
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color }}>{title}</h3>
        <span style={{
          marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)',
          background: 'rgba(255,255,255,0.06)', borderRadius: 4, padding: '2px 7px',
        }}>
          {players.length} joueur{players.length > 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {players.map((p, idx) => (
          <div key={p.id} style={{
            display:      'flex',
            alignItems:   'center',
            gap:          14,
            background:   'rgba(255,255,255,0.03)',
            border:       '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10,
            padding:      '12px 16px',
          }}>
            {/* Rank */}
            <span style={{
              fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
              minWidth: 18, fontFamily: 'var(--font-mono)',
            }}>
              #{idx + 1}
            </span>

            {/* Score ring */}
            <div style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              background: `conic-gradient(${scoreColor(p.scout_score)} ${p.scout_score}%, rgba(255,255,255,0.06) 0)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'var(--surface2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: scoreColor(p.scout_score),
                fontFamily: 'var(--font-mono)',
              }}>
                {p.scout_score}
              </div>
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.name}
                {showAge && p.age && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>
                    {p.age} ans
                  </span>
                )}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                {p.team} · {p.primary_position} · {p.competition}
              </p>
            </div>

            {/* Label */}
            {showLabel && p.scout_label && (
              <span style={{
                fontSize:     11,
                fontWeight:   700,
                color:        LABEL_COLOR[p.scout_label] ?? '#6b7280',
                background:   `${LABEL_COLOR[p.scout_label] ?? '#6b7280'}18`,
                border:       `1px solid ${LABEL_COLOR[p.scout_label] ?? '#6b7280'}33`,
                borderRadius: 5,
                padding:      '3px 8px',
                flexShrink:   0,
              }}>
                {p.scout_label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
