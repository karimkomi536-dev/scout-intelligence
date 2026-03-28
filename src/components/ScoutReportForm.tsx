/**
 * ScoutReportForm — Modal for submitting a structured scouting report.
 * 5 criteria rated 1–5 stars, match context, free-text summary, recommendation.
 * Score = Math.round((sum of 5 criteria / 5) * 20) → 0–100
 */

import { useState } from 'react'
import { X, Send, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ScoutReport {
  id:             string
  player_id:      string
  user_id:        string
  organization_id: string | null
  technique:      number
  tactique:       number
  mental:         number
  physique:       number
  potentiel:      number
  match_date:     string
  competition:    string
  venue:          string
  summary:        string
  recommendation: 'signer' | 'suivre' | 'écarter'
  created_at:     string
}

interface Props {
  playerId:        string
  organizationId?: string | null
  onClose:         () => void
  onSaved:         (report: ScoutReport) => void
}

// ── Criteria ──────────────────────────────────────────────────────────────────

const CRITERIA: { key: keyof Ratings; label: string; desc: string }[] = [
  { key: 'technique', label: 'Technique balle en main',   desc: 'Contrôle, dribble, passe, première touche' },
  { key: 'tactique',  label: 'Comportement hors ballon',  desc: 'Placement, pressing, lecture du jeu' },
  { key: 'mental',    label: 'Mentalité & engagement',    desc: 'Agressivité, discipline, leadership' },
  { key: 'physique',  label: 'Physique & vitesse',        desc: 'Endurance, puissance, explosivité' },
  { key: 'potentiel', label: 'Potentiel d\'évolution',    desc: 'Marge de progression, age, ambition' },
]

interface Ratings {
  technique: number
  tactique:  number
  mental:    number
  physique:  number
  potentiel: number
}

const RECO_CONFIG: { value: 'signer' | 'suivre' | 'écarter'; label: string; color: string; bg: string }[] = [
  { value: 'signer',  label: 'Signer',  color: '#00C896', bg: 'rgba(0,200,150,0.12)' },
  { value: 'suivre',  label: 'Suivre',  color: '#4D7FFF', bg: 'rgba(77,127,255,0.12)' },
  { value: 'écarter', label: 'Écarter', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function ScoutReportForm({ playerId, organizationId, onClose, onSaved }: Props) {
  const { user } = useAuth()

  const [ratings, setRatings] = useState<Ratings>({ technique: 0, tactique: 0, mental: 0, physique: 0, potentiel: 0 })
  const [hovered, setHovered] = useState<{ key: keyof Ratings; star: number } | null>(null)
  const [matchDate, setMatchDate]   = useState(new Date().toISOString().slice(0, 10))
  const [competition, setCompetition] = useState('')
  const [venue, setVenue]           = useState('')
  const [summary, setSummary]       = useState('')
  const [reco, setReco]             = useState<'signer' | 'suivre' | 'écarter' | ''>('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  const sumRatings = Object.values(ratings).reduce((a, b) => a + b, 0)
  const allRated   = Object.values(ratings).every(v => v > 0)
  const score      = allRated ? Math.round((sumRatings / 5) * 20) : null
  const canSubmit  = allRated && reco !== '' && matchDate

  function setRating(key: keyof Ratings, star: number) {
    setRatings(prev => ({ ...prev, [key]: star }))
  }

  function displayStar(key: keyof Ratings, star: number) {
    const h = hovered?.key === key ? hovered.star : 0
    return h ? star <= h : star <= ratings[key]
  }

  async function handleSubmit() {
    if (!canSubmit || !user) return
    setSaving(true)
    setError('')

    const { data, error: err } = await supabase
      .from('scout_reports')
      .insert({
        player_id:       playerId,
        user_id:         user.id,
        organization_id: organizationId ?? null,
        ...ratings,
        match_date:   matchDate,
        competition,
        venue,
        summary,
        recommendation: reco,
      })
      .select()
      .single()

    setSaving(false)

    if (err || !data) {
      setError(err?.message ?? 'Erreur lors de la sauvegarde.')
      return
    }

    onSaved(data as ScoutReport)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          animation: 'fadeIn 0.15s ease',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(580px, calc(100vw - 32px))',
        maxHeight: 'calc(100vh - 48px)',
        overflowY: 'auto',
        background: 'var(--surface1, #0F1624)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '16px',
        zIndex: 1001,
        animation: 'slideUp 0.2s ease',
        scrollbarWidth: 'none',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          position: 'sticky', top: 0,
          background: 'var(--surface1, #0F1624)',
          zIndex: 1,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Rapport de scouting
            </h2>
            {score !== null && (
              <span style={{
                fontSize: '11px', fontFamily: 'var(--font-mono)',
                color: score >= 60 ? '#00C896' : score >= 40 ? '#F5A623' : '#ef4444',
              }}>
                Score calculé : {score}/100
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '4px', borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Match context */}
          <div>
            <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--text-muted)', marginBottom: '10px', fontFamily: 'var(--font-mono)' }}>
              Contexte du match
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Date *</label>
                <input
                  type="date"
                  value={matchDate}
                  onChange={e => setMatchDate(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: '8px', padding: '8px 10px',
                    color: 'var(--text-primary)', fontSize: '13px',
                    colorScheme: 'dark',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Compétition</label>
                <input
                  type="text"
                  value={competition}
                  onChange={e => setCompetition(e.target.value)}
                  placeholder="ex. Ligue 1, U21…"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: '8px', padding: '8px 10px',
                    color: 'var(--text-primary)', fontSize: '13px',
                  }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Lieu</label>
                <input
                  type="text"
                  value={venue}
                  onChange={e => setVenue(e.target.value)}
                  placeholder="ex. Stade de la Beaujoire, Nantes"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: '8px', padding: '8px 10px',
                    color: 'var(--text-primary)', fontSize: '13px',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Rating grid */}
          <div>
            <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--text-muted)', marginBottom: '10px', fontFamily: 'var(--font-mono)' }}>
              Notation (1–5 étoiles) *
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {CRITERIA.map(({ key, label, desc }) => (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${ratings[key] > 0 ? 'rgba(77,127,255,0.25)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: '10px',
                  gap: '12px',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{desc}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setRating(key, star)}
                        onMouseEnter={() => setHovered({ key, star })}
                        onMouseLeave={() => setHovered(null)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          padding: '2px', fontSize: '20px', lineHeight: 1,
                          color: displayStar(key, star) ? '#F5A623' : 'rgba(255,255,255,0.12)',
                          transition: 'color 100ms ease',
                        }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--text-muted)', margin: 0, fontFamily: 'var(--font-mono)' }}>
                Synthèse
              </p>
              <span style={{ fontSize: '11px', color: summary.length > 450 ? '#F5A623' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {summary.length}/500
              </span>
            </div>
            <textarea
              value={summary}
              onChange={e => setSummary(e.target.value.slice(0, 500))}
              placeholder="Observations clés, points forts, points faibles…"
              rows={4}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: '10px', padding: '12px',
                color: 'var(--text-primary)', fontSize: '13px',
                lineHeight: 1.6, resize: 'none',
                fontFamily: 'var(--font-ui, sans-serif)',
              }}
            />
          </div>

          {/* Recommendation */}
          <div>
            <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'var(--text-muted)', marginBottom: '10px', fontFamily: 'var(--font-mono)' }}>
              Recommandation finale *
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {RECO_CONFIG.map(({ value, label, color, bg }) => (
                <button
                  key={value}
                  onClick={() => setReco(value)}
                  style={{
                    flex: 1, padding: '10px',
                    background: reco === value ? bg : 'rgba(255,255,255,0.03)',
                    border: `2px solid ${reco === value ? color : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '10px', cursor: 'pointer',
                    color: reco === value ? color : 'var(--text-muted)',
                    fontSize: '13px', fontWeight: 700,
                    transition: 'all 150ms ease',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)',
              color: '#ef4444', fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '12px',
              background: canSubmit ? 'var(--accent-blue, #4D7FFF)' : 'rgba(255,255,255,0.06)',
              border: 'none', borderRadius: '10px', cursor: canSubmit ? 'pointer' : 'not-allowed',
              color: canSubmit ? '#fff' : 'var(--text-muted)',
              fontSize: '14px', fontWeight: 600,
              transition: 'opacity 150ms ease',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving
              ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Enregistrement…</>
              : <><Send size={15} /> Soumettre le rapport</>
            }
          </button>

          {!canSubmit && (
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', margin: 0, fontFamily: 'var(--font-mono)' }}>
              {!allRated ? 'Notez les 5 critères' : 'Sélectionnez une recommandation'}
            </p>
          )}
        </div>
      </div>
    </>
  )
}
