import { useState, useEffect } from 'react'
import { Lock, Save, RotateCcw, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useScoringProfile } from '../hooks/useScoringProfile'
import { calculateScore, getScoreLabel, DEFAULT_GROUP_WEIGHTS, getPosGroup } from '../utils/scoring'
import type { PosGroup, ScoringWeights } from '../utils/scoring'
import type { Player } from '../types/player'

// ── Types ────────────────────────────────────────────────────────────────────

type WeightKey = keyof ScoringWeights

const WEIGHT_KEYS: WeightKey[] = ['technique', 'physical', 'pace', 'mental', 'tactical', 'potential']

const WEIGHT_LABELS: Record<WeightKey, string> = {
  technique: 'Technique',
  physical:  'Physique',
  pace:      'Vitesse',
  mental:    'Mental',
  tactical:  'Tactique',
  potential: 'Potentiel',
}

const WEIGHT_COLORS: Record<WeightKey, string> = {
  technique: '#4D7FFF',
  physical:  '#00C896',
  pace:      '#22D4E8',
  mental:    '#9B6DFF',
  tactical:  '#F5A623',
  potential: '#ec4899',
}

const POS_GROUPS: PosGroup[] = ['GK', 'DEF', 'MID', 'ATT']

const POS_GROUP_LABELS: Record<PosGroup, string> = {
  GK:  'Gardien (GK)',
  DEF: 'Défenseur (DEF)',
  MID: 'Milieu (MID)',
  ATT: 'Attaquant (ATT)',
}

// Normalize to percentages (0–100) from decimal weights
function toPercent(w: ScoringWeights): Record<WeightKey, number> {
  const result = {} as Record<WeightKey, number>
  for (const key of WEIGHT_KEYS) {
    result[key] = Math.round((w[key] ?? 0) * 100)
  }
  return result
}

// Convert percentages back to decimal weights
function fromPercent(p: Record<WeightKey, number>): ScoringWeights {
  const result = {} as ScoringWeights
  for (const key of WEIGHT_KEYS) {
    if (p[key] > 0) result[key] = p[key] / 100
  }
  return result
}

function sum(p: Record<WeightKey, number>): number {
  return WEIGHT_KEYS.reduce((acc, k) => acc + (p[k] ?? 0), 0)
}

// ── Component ────────────────────────────────────────────────────────────────

export default function Settings() {
  const { weights: orgWeights, isProPlan, orgId, loading } = useScoringProfile()

  // Local edit state: percentages (0-100) per position group
  const [editWeights, setEditWeights] = useState<Record<PosGroup, Record<WeightKey, number>>>(() => ({
    GK:  toPercent(DEFAULT_GROUP_WEIGHTS.GK),
    DEF: toPercent(DEFAULT_GROUP_WEIGHTS.DEF),
    MID: toPercent(DEFAULT_GROUP_WEIGHTS.MID),
    ATT: toPercent(DEFAULT_GROUP_WEIGHTS.ATT),
  }))
  const [activeTab, setActiveTab] = useState<PosGroup>('ATT')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [previewPlayer, setPreviewPlayer] = useState<Player | null>(null)

  // Sync from loaded org weights once
  useEffect(() => {
    if (!loading) {
      setEditWeights({
        GK:  toPercent(orgWeights.GK),
        DEF: toPercent(orgWeights.DEF),
        MID: toPercent(orgWeights.MID),
        ATT: toPercent(orgWeights.ATT),
      })
    }
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch a sample player for preview (first ATT in DB)
  useEffect(() => {
    supabase
      .from('players')
      .select('id,name,primary_position,scout_score,individual_stats')
      .in('primary_position', ['ST', 'LW', 'RW', 'ATT'])
      .not('individual_stats', 'is', null)
      .order('scout_score', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) setPreviewPlayer(data[0] as Player)
      })
  }, [])

  const current = editWeights[activeTab]
  const total   = sum(current)
  const isValid = total === 100

  function setSlider(key: WeightKey, value: number) {
    setEditWeights(prev => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], [key]: value },
    }))
    setSaved(false)
  }

  function resetToDefault() {
    setEditWeights(prev => ({
      ...prev,
      [activeTab]: toPercent(DEFAULT_GROUP_WEIGHTS[activeTab]),
    }))
    setSaved(false)
  }

  async function handleSave() {
    if (!orgId || !isValid) return
    setSaving(true)
    try {
      const payload = POS_GROUPS.map(group => ({
        organization_id: orgId,
        position_group:  group,
        weights:         fromPercent(editWeights[group]),
      }))
      await supabase
        .from('scoring_profiles')
        .upsert(payload, { onConflict: 'organization_id,position_group' })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  // Live preview score
  const previewScore = previewPlayer
    ? calculateScore(previewPlayer, fromPercent(editWeights[getPosGroup(previewPlayer.primary_position)]))
    : null
  const previewLabel = previewScore !== null ? getScoreLabel(previewScore) : null

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Chargement…
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px' }}>

      {/* Page title */}
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
        Paramètres
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '32px' }}>
        Configurez les pondérations de scoring par position pour votre organisation.
      </p>

      {/* ── Scoring section ── */}
      <section style={{
        background: 'var(--bg-card)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Pondérations de scoring
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Ajustez l'importance de chaque critère par groupe de position
            </p>
          </div>
          {!isProPlan && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(155,109,255,0.12)',
              border: '1px solid rgba(155,109,255,0.30)',
              borderRadius: '20px', padding: '5px 12px',
              fontSize: '11px', fontWeight: 700, color: '#9B6DFF',
            }}>
              <Lock size={11} /> Pro+
            </div>
          )}
        </div>

        {/* Pro gate */}
        {!isProPlan ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px', margin: '0 auto 16px',
              background: 'rgba(155,109,255,0.12)',
              border: '1px solid rgba(155,109,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#9B6DFF',
            }}>
              <Lock size={20} />
            </div>
            <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Fonctionnalité Pro+
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '360px', margin: '0 auto 20px' }}>
              Les pondérations personnalisées sont réservées aux plans Pro et Enterprise.
              Passez à Pro pour adapter le scoring à votre méthodologie.
            </p>
            <button style={{
              background: 'linear-gradient(135deg,#9B6DFF,#4D7FFF)',
              border: 'none', borderRadius: '10px',
              color: 'white', fontWeight: 700, fontSize: '13px',
              padding: '10px 24px', cursor: 'pointer',
            }}>
              Passer à Pro →
            </button>
          </div>
        ) : (
          <div style={{ padding: '24px' }}>

            {/* Position group tabs */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {POS_GROUPS.map(group => (
                <button
                  key={group}
                  onClick={() => setActiveTab(group)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '20px',
                    border: `1px solid ${activeTab === group ? '#4D7FFF' : 'rgba(255,255,255,0.10)'}`,
                    background: activeTab === group ? 'rgba(77,127,255,0.16)' : 'transparent',
                    color: activeTab === group ? '#4D7FFF' : 'var(--text-muted)',
                    fontSize: '12px', fontWeight: activeTab === group ? 700 : 400,
                    cursor: 'pointer', transition: 'all 150ms ease',
                  }}
                >
                  {POS_GROUP_LABELS[group]}
                </button>
              ))}
            </div>

            {/* Sliders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              {WEIGHT_KEYS.map(key => (
                <div key={key}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{
                      fontSize: '12px', fontWeight: 600,
                      color: WEIGHT_COLORS[key],
                    }}>
                      {WEIGHT_LABELS[key]}
                    </span>
                    <span style={{
                      fontSize: '12px', fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      color: current[key] > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}>
                      {current[key]}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0} max={100} step={5}
                    value={current[key]}
                    onChange={e => setSlider(key, Number(e.target.value))}
                    style={{ width: '100%', accentColor: WEIGHT_COLORS[key], cursor: 'pointer' }}
                  />
                </div>
              ))}
            </div>

            {/* Sum indicator */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 14px', borderRadius: '10px', marginBottom: '20px',
              background: isValid
                ? 'rgba(0,200,150,0.08)'
                : total > 100
                  ? 'rgba(239,68,68,0.10)'
                  : 'rgba(245,166,35,0.08)',
              border: `1px solid ${isValid ? 'rgba(0,200,150,0.25)' : total > 100 ? 'rgba(239,68,68,0.25)' : 'rgba(245,166,35,0.25)'}`,
            }}>
              <span style={{
                fontSize: '12px', fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                color: isValid ? '#00C896' : total > 100 ? '#ef4444' : '#F5A623',
              }}>
                Total : {total}%
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {isValid ? '— Valide ✓' : total > 100 ? `— Dépassement de ${total - 100}%` : `— Il manque ${100 - total}%`}
              </span>
            </div>

            {/* Live preview */}
            {previewPlayer && previewScore !== null && (
              <div style={{
                padding: '12px 16px', borderRadius: '10px', marginBottom: '20px',
                background: 'rgba(77,127,255,0.06)',
                border: '1px solid rgba(77,127,255,0.15)',
                fontSize: '12px', color: 'var(--text-secondary)',
              }}>
                Avec ces pondérations,{' '}
                <strong style={{ color: 'var(--text-primary)' }}>
                  {previewPlayer.name}
                </strong>{' '}
                serait{' '}
                <strong style={{ color: '#4D7FFF' }}>
                  {previewLabel} ({previewScore})
                </strong>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={resetToDefault}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'none', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '10px', color: 'var(--text-muted)',
                  fontSize: '12px', fontWeight: 600, padding: '9px 16px',
                  cursor: 'pointer', transition: 'all 150ms ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <RotateCcw size={13} /> Réinitialiser
              </button>

              <button
                onClick={handleSave}
                disabled={!isValid || saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: saved
                    ? 'rgba(0,200,150,0.18)'
                    : isValid
                      ? 'rgba(77,127,255,0.20)'
                      : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${saved ? 'rgba(0,200,150,0.35)' : isValid ? 'rgba(77,127,255,0.40)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '10px',
                  color: saved ? '#00C896' : isValid ? '#4D7FFF' : 'var(--text-muted)',
                  fontSize: '12px', fontWeight: 700, padding: '9px 20px',
                  cursor: isValid && !saving ? 'pointer' : 'not-allowed',
                  transition: 'all 150ms ease',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saved
                  ? <><CheckCircle size={13} /> Sauvegardé</>
                  : <><Save size={13} /> {saving ? 'Sauvegarde…' : 'Sauvegarder'}</>}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
