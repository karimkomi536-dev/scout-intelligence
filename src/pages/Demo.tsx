import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend,
} from 'recharts'
import { ArrowLeft, Heart, FileDown, X, Zap, UserPlus } from 'lucide-react'
import { calculateScore, getScoreLabel } from '../utils/scoring'
import type { Player } from '../types/player'
import VizionLogo from '../components/VizionLogo'
import { DemoProvider, useDemo } from '../contexts/DemoContext'

// ── Constants ─────────────────────────────────────────────────────────────────

const LABEL_META: Record<string, { color: string; bg: string }> = {
  'ELITE':        { color: '#00C896', bg: 'rgba(0,200,150,0.15)'   },
  'TOP PROSPECT': { color: '#4D7FFF', bg: 'rgba(77,127,255,0.15)'  },
  'INTERESTING':  { color: '#F5A623', bg: 'rgba(245,166,35,0.15)'  },
  'TO MONITOR':   { color: '#9B6DFF', bg: 'rgba(155,109,255,0.15)' },
  'LOW PRIORITY': { color: '#5A7090', bg: 'rgba(90,112,144,0.15)'  },
}

const POS_GROUP: Record<string, string> = {
  GK: 'GK',
  CB: 'DEF', LB: 'DEF', RB: 'DEF',
  CDM: 'MID', CM: 'MID', CAM: 'MID',
  LW: 'ATT', RW: 'ATT', ST: 'ATT',
}

const POS_GROUP_COLOR: Record<string, string> = {
  GK:  '#F5A623',
  DEF: '#4D7FFF',
  MID: '#00C896',
  ATT: '#ef4444',
}

const POSITION_FILTER_OPTIONS = ['Tous', 'GK', 'DEF', 'MID', 'ATT'] as const
type PosFilter = typeof POSITION_FILTER_OPTIONS[number]

const LABEL_FILTER_OPTIONS = [
  'ELITE', 'TOP PROSPECT', 'INTERESTING', 'TO MONITOR', 'LOW PRIORITY',
] as const
type LabelFilter = typeof LABEL_FILTER_OPTIONS[number]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMarketValue(eur: number): string {
  if (eur >= 1_000_000_000) return `${(eur / 1_000_000_000).toFixed(1).replace('.0', '')}Md €`
  if (eur >= 1_000_000)     return `${(eur / 1_000_000).toFixed(1).replace('.0', '')}M €`
  if (eur >= 1_000)         return `${Math.round(eur / 1_000)}k €`
  return `${eur} €`
}

function fmt(v: unknown, decimals = 1): string {
  const n = Number(v)
  return isNaN(n) || n === 0 ? '—' : n.toFixed(decimals)
}

function nationalityFlag(code: string | null): string {
  if (!code) return ''
  const map: Record<string, string> = {
    FR: '🇫🇷', ES: '🇪🇸', IT: '🇮🇹', DE: '🇩🇪',
    SN: '🇸🇳', CI: '🇨🇮', MA: '🇲🇦', BR: '🇧🇷',
    AR: '🇦🇷', PT: '🇵🇹',
  }
  return map[code] ?? code
}

// ── ScoreRing (small) ─────────────────────────────────────────────────────────

function ScoreRingSmall({ score, color }: { score: number; color: string }) {
  const r = 14
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <svg width="36" height="36" style={{ flexShrink: 0 }}>
      <circle cx="18" cy="18" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
      <circle
        cx="18" cy="18" r={r} fill="none"
        stroke={color} strokeWidth="2.5"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 18 18)"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}
      />
      <text x="18" y="22" textAnchor="middle" fill={color}
        style={{ fontFamily: 'monospace', fontSize: '9px', fontWeight: 600 }}>
        {score}
      </text>
    </svg>
  )
}

// ── ScoreRing (large) ─────────────────────────────────────────────────────────

function ScoreRingLarge({ score, color }: { score: number; color: string }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <svg width="110" height="110" style={{ flexShrink: 0 }}>
      <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
      <circle
        cx="55" cy="55" r={r} fill="none"
        stroke={color} strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 55 55)"
        style={{ filter: `drop-shadow(0 0 8px ${color})` }}
      />
      <text x="55" y="52" textAnchor="middle" fill={color}
        style={{ fontFamily: 'monospace', fontSize: '22px', fontWeight: 700 }}>
        {score}
      </text>
      <text x="55" y="68" textAnchor="middle" fill="rgba(255,255,255,0.4)"
        style={{ fontFamily: 'monospace', fontSize: '10px' }}>
        /100
      </text>
    </svg>
  )
}

// ── DemoUpgradeModal ──────────────────────────────────────────────────────────

function DemoUpgradeModal({ feature, onClose }: { feature: string; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#131929',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: '16px',
          padding: '36px 32px',
          maxWidth: '380px', width: '100%',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '16px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.4)', padding: '4px',
          }}
        >
          <X size={18} />
        </button>

        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'rgba(0,200,150,0.12)',
          border: '1.5px solid rgba(0,200,150,0.30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Zap size={24} color="#00C896" fill="#00C896" />
        </div>

        <h3 style={{
          margin: '0 0 10px', fontSize: '18px', fontWeight: 700,
          color: '#E2EAF4',
        }}>
          Fonctionnalité réservée
        </h3>

        <p style={{
          margin: '0 0 24px', fontSize: '14px',
          color: 'rgba(226,234,244,0.55)', lineHeight: 1.6,
        }}>
          Créez un compte gratuit pour débloquer{' '}
          <strong style={{ color: '#E2EAF4' }}>{feature}</strong>.
        </p>

        <Link
          to="/register?source=demo"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: '#00C896', color: '#0A0E1B',
            padding: '12px 24px', borderRadius: '8px',
            fontWeight: 700, fontSize: '14px', textDecoration: 'none',
          }}
        >
          <UserPlus size={16} />
          Commencer gratuitement
        </Link>
      </div>
    </div>
  )
}

// ── DemoPlayerCard ─────────────────────────────────────────────────────────────

function DemoPlayerCard({
  player,
  onClick,
}: {
  player: Player
  onClick: () => void
}) {
  const { isShortlisted, toggleShortlist } = useDemo()
  const score = calculateScore(player)
  const label = getScoreLabel(score)
  const meta = LABEL_META[label]
  const group = POS_GROUP[player.primary_position] ?? 'ATT'
  const groupColor = POS_GROUP_COLOR[group]
  const shortlisted = isShortlisted(player.id)

  return (
    <div
      onClick={onClick}
      style={{
        background: '#131929',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '12px',
        padding: '16px',
        cursor: 'pointer',
        transition: 'border-color 0.15s, transform 0.1s',
        display: 'flex', flexDirection: 'column', gap: '12px',
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.16)'
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'
        ;(e.currentTarget as HTMLDivElement).style.transform = 'none'
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ScoreRingSmall score={score} color={meta.color} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '15px', fontWeight: 700, color: '#E2EAF4',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {player.name}
          </div>
          <div style={{
            fontSize: '12px', color: 'rgba(226,234,244,0.50)',
            marginTop: '2px',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {player.team} · {player.competition}
          </div>
        </div>

        <button
          onClick={e => { e.stopPropagation(); toggleShortlist(player.id) }}
          title={shortlisted ? 'Retirer de la shortlist' : 'Ajouter à la shortlist'}
          style={{
            background: shortlisted ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${shortlisted ? 'rgba(239,68,68,0.40)' : 'rgba(255,255,255,0.10)'}`,
            borderRadius: '8px', cursor: 'pointer', flexShrink: 0,
            width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Heart size={14} color={shortlisted ? '#ef4444' : 'rgba(226,234,244,0.45)'} fill={shortlisted ? '#ef4444' : 'none'} />
        </button>
      </div>

      {/* Tags row */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{
          fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
          background: `rgba(${group === 'GK' ? '245,166,35' : group === 'DEF' ? '77,127,255' : group === 'MID' ? '0,200,150' : '239,68,68'},0.12)`,
          color: groupColor, border: `1px solid ${groupColor}22`,
        }}>
          {player.primary_position}
        </span>
        <span style={{
          fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
          background: meta.bg, color: meta.color,
        }}>
          {label}
        </span>
        {player.nationality && (
          <span style={{ fontSize: '13px' }} title={player.nationality}>
            {nationalityFlag(player.nationality)}
          </span>
        )}
        {player.market_value_eur && (
          <span style={{ fontSize: '11px', color: 'rgba(226,234,244,0.40)', marginLeft: 'auto' }}>
            {formatMarketValue(player.market_value_eur)}
          </span>
        )}
      </div>

      {/* Score bar */}
      <div style={{
        height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: '2px',
          width: `${score}%`,
          background: `linear-gradient(90deg, ${meta.color}99, ${meta.color})`,
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Key stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px',
      }}>
        {[
          { label: 'Buts', value: player.goals },
          { label: 'Passes D.', value: player.assists },
          { label: 'xG', value: fmt(player.xg) },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#E2EAF4' }}>{s.value}</div>
            <div style={{ fontSize: '10px', color: 'rgba(226,234,244,0.35)' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── DemoPlayerList ─────────────────────────────────────────────────────────────

function DemoPlayerList({ onSelectPlayer }: { onSelectPlayer: (p: Player) => void }) {
  const { players } = useDemo()
  const [search, setSearch] = useState('')
  const [posFilter, setPosFilter] = useState<PosFilter>('Tous')
  const [labelFilters, setLabelFilters] = useState<Set<LabelFilter>>(new Set())

  const filtered = useMemo(() => {
    return players.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      if (posFilter !== 'Tous') {
        const group = POS_GROUP[p.primary_position] ?? 'ATT'
        if (group !== posFilter && p.primary_position !== posFilter) return false
      }
      if (labelFilters.size > 0) {
        const label = getScoreLabel(calculateScore(p))
        if (!labelFilters.has(label as LabelFilter)) return false
      }
      return true
    })
  }, [players, search, posFilter, labelFilters])

  function toggleLabel(l: LabelFilter) {
    setLabelFilters(prev => {
      const next = new Set(prev)
      if (next.has(l)) next.delete(l)
      else next.add(l)
      return next
    })
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#E2EAF4' }}>
            Base de joueurs
          </h2>
          <span style={{
            fontSize: '13px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
            background: 'rgba(0,200,150,0.12)', color: '#00C896',
            border: '1px solid rgba(0,200,150,0.25)',
          }}>
            {filtered.length} joueur{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="Rechercher un joueur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#1A2235', border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: '10px', padding: '10px 16px 10px 40px',
              color: '#E2EAF4', fontSize: '14px', outline: 'none',
            }}
          />
          <svg
            style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E2EAF4" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
        </div>

        {/* Position filter pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {POSITION_FILTER_OPTIONS.map(pos => (
            <button
              key={pos}
              onClick={() => setPosFilter(pos)}
              style={{
                padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', border: '1px solid',
                borderColor: posFilter === pos ? '#00C896' : 'rgba(255,255,255,0.12)',
                background: posFilter === pos ? 'rgba(0,200,150,0.12)' : 'transparent',
                color: posFilter === pos ? '#00C896' : 'rgba(226,234,244,0.55)',
                transition: 'all 0.15s',
              }}
            >
              {pos}
            </button>
          ))}
        </div>

        {/* Label filter pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {LABEL_FILTER_OPTIONS.map(l => {
            const meta = LABEL_META[l]
            const active = labelFilters.has(l)
            return (
              <button
                key={l}
                onClick={() => toggleLabel(l)}
                style={{
                  padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                  cursor: 'pointer', border: '1px solid',
                  borderColor: active ? meta.color : 'rgba(255,255,255,0.10)',
                  background: active ? meta.bg : 'transparent',
                  color: active ? meta.color : 'rgba(226,234,244,0.40)',
                  transition: 'all 0.15s',
                }}
              >
                {l}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '80px 24px',
          color: 'rgba(226,234,244,0.35)', fontSize: '14px',
        }}>
          Aucun joueur ne correspond à vos filtres.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px',
        }}>
          {filtered.map(p => (
            <DemoPlayerCard key={p.id} player={p} onClick={() => onSelectPlayer(p)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── DemoPlayerDetail ──────────────────────────────────────────────────────────

type DetailTab = 'profil' | 'stats' | 'notes' | 'rapport'

function DemoPlayerDetail({ player, onBack }: { player: Player; onBack: () => void }) {
  const { isShortlisted, toggleShortlist } = useDemo()
  const [activeTab, setActiveTab] = useState<DetailTab>('profil')
  const [upgradeFeature, setUpgradeFeature] = useState<string | null>(null)

  const score = calculateScore(player)
  const label = getScoreLabel(score)
  const meta = LABEL_META[label]
  const shortlisted = isShortlisted(player.id)
  const group = POS_GROUP[player.primary_position] ?? 'ATT'
  const groupColor = POS_GROUP_COLOR[group]

  const radarData = player.individual_stats
    ? [
        { axis: 'Technique', value: player.individual_stats.technique },
        { axis: 'Physical',  value: player.individual_stats.physical  },
        { axis: 'Pace',      value: player.individual_stats.pace      },
        { axis: 'Mental',    value: player.individual_stats.mental    },
        { axis: 'Tactical',  value: player.individual_stats.tactical  },
        { axis: 'Potential', value: player.individual_stats.potential },
      ]
    : []

  const tabs: { id: DetailTab; label: string; locked?: boolean }[] = [
    { id: 'profil',  label: 'Profil' },
    { id: 'stats',   label: 'Stats' },
    { id: 'notes',   label: 'Notes 🔒',     locked: true },
    { id: 'rapport', label: 'Rapport IA 🔒', locked: true },
  ]

  return (
    <>
      {upgradeFeature && (
        <DemoUpgradeModal feature={upgradeFeature} onClose={() => setUpgradeFeature(null)} />
      )}

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Back button */}
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(226,234,244,0.55)', fontSize: '14px', padding: '0 0 20px',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#E2EAF4')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(226,234,244,0.55)')}
        >
          <ArrowLeft size={16} /> Joueurs
        </button>

        {/* Player header */}
        <div style={{
          background: '#131929',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px',
          display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center',
        }}>
          <ScoreRingLarge score={score} color={meta.color} />

          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#E2EAF4' }}>
                {player.name}
              </h1>
              {player.nationality && (
                <span style={{ fontSize: '20px' }} title={player.nationality}>
                  {nationalityFlag(player.nationality)}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <span style={{
                fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '5px',
                background: `rgba(${group === 'GK' ? '245,166,35' : group === 'DEF' ? '77,127,255' : group === 'MID' ? '0,200,150' : '239,68,68'},0.12)`,
                color: groupColor,
              }}>
                {player.primary_position}
              </span>
              <span style={{
                fontSize: '12px', fontWeight: 600, padding: '3px 10px', borderRadius: '5px',
                background: meta.bg, color: meta.color,
              }}>
                {label}
              </span>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '6px',
            }}>
              {[
                { label: 'Équipe', value: player.team },
                { label: 'Compétition', value: player.competition },
                { label: 'Âge', value: player.age ? `${player.age} ans` : '—' },
                { label: 'Pied', value: player.foot ?? '—' },
                { label: 'Valeur marchande', value: player.market_value_eur ? formatMarketValue(player.market_value_eur) : '—' },
                { label: 'Minutes jouées', value: `${player.minutes_played}` },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: '10px', color: 'rgba(226,234,244,0.35)', marginBottom: '1px' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#E2EAF4' }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignSelf: 'flex-start' }}>
            <button
              onClick={() => toggleShortlist(player.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '9px 16px', borderRadius: '8px', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600,
                border: `1px solid ${shortlisted ? 'rgba(239,68,68,0.40)' : 'rgba(255,255,255,0.12)'}`,
                background: shortlisted ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.05)',
                color: shortlisted ? '#ef4444' : 'rgba(226,234,244,0.70)',
                transition: 'all 0.15s',
              }}
            >
              <Heart size={14} fill={shortlisted ? '#ef4444' : 'none'} />
              {shortlisted ? 'Shortlisté' : 'Shortlist'}
            </button>
            <button
              onClick={() => setUpgradeFeature('l\'export PDF')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '9px 16px', borderRadius: '8px', cursor: 'pointer',
                fontSize: '13px', fontWeight: 600,
                border: '1px solid rgba(255,255,255,0.10)',
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(226,234,244,0.45)',
              }}
            >
              <FileDown size={14} /> PDF 🔒
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: '4px',
          background: '#131929', borderRadius: '10px', padding: '4px',
          marginBottom: '20px',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.locked) {
                  const featureMap: Record<string, string> = {
                    notes: 'les notes de scout',
                    rapport: 'le rapport IA',
                  }
                  setUpgradeFeature(featureMap[tab.id] ?? tab.label)
                } else {
                  setActiveTab(tab.id)
                }
              }}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: '7px',
                border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                transition: 'all 0.15s',
                background: activeTab === tab.id && !tab.locked
                  ? 'rgba(0,200,150,0.12)'
                  : 'transparent',
                color: activeTab === tab.id && !tab.locked
                  ? '#00C896'
                  : 'rgba(226,234,244,0.45)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{
          background: '#131929',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '16px',
          padding: '24px',
        }}>
          {activeTab === 'profil' && (
            <div>
              <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: 700, color: 'rgba(226,234,244,0.70)' }}>
                Radar des attributs
              </h3>
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={340}>
                  <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                    <PolarAngleAxis
                      dataKey="axis"
                      tick={{ fill: 'rgba(226,234,244,0.55)', fontSize: 12 }}
                    />
                    <Radar
                      name={player.name}
                      dataKey="value"
                      stroke="#00C896"
                      fill="#00C896"
                      fillOpacity={0.18}
                      strokeWidth={2}
                      dot={{ fill: '#00C896', r: 3 }}
                    />
                    <Legend
                      formatter={() => player.name}
                      wrapperStyle={{ color: 'rgba(226,234,244,0.55)', fontSize: '12px' }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <p style={{ color: 'rgba(226,234,244,0.35)', textAlign: 'center' }}>
                  Pas de données individuelles disponibles.
                </p>
              )}

              {/* Attribute bars */}
              {player.individual_stats && (
                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(
                    [
                      ['Technique', player.individual_stats.technique, '#4D7FFF'],
                      ['Physical',  player.individual_stats.physical,  '#00C896'],
                      ['Pace',      player.individual_stats.pace,      '#22D4E8'],
                      ['Mental',    player.individual_stats.mental,    '#9B6DFF'],
                      ['Tactical',  player.individual_stats.tactical,  '#F5A623'],
                      ['Potential', player.individual_stats.potential, '#ec4899'],
                    ] as [string, number, string][]
                  ).map(([name, value, color]) => (
                    <div key={name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: 'rgba(226,234,244,0.55)' }}>{name}</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color }}>{value}</span>
                      </div>
                      <div style={{ height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)' }}>
                        <div style={{
                          height: '100%', borderRadius: '3px',
                          width: `${value}%`, background: color,
                          opacity: 0.75,
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div>
              <h3 style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: 700, color: 'rgba(226,234,244,0.70)' }}>
                Statistiques de saison
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <tbody>
                  {[
                    ['Apparitions', player.appearances],
                    ['Minutes jouées', player.minutes_played],
                    ['Buts', player.goals],
                    ['Passes décisives', player.assists],
                    ['xG', fmt(player.xg)],
                    ['xA', fmt(player.xa)],
                    ['Actions créatrices de tir', player.shot_creating_actions],
                    ['Tacles', player.tackles],
                    ['Interceptions', player.interceptions],
                    ['Blocs', player.blocks],
                    ['Dégagements', player.clearances],
                    ['Pressions', player.pressures],
                    ['Taux de pression réussie', `${fmt(player.pressure_success_rate)}%`],
                    ['Taux de passes réussies', `${fmt(player.pass_completion_rate)}%`],
                    ['Passes progressives', player.progressive_passes],
                    ['Passes clés', player.key_passes],
                  ].map(([label, value], i) => (
                    <tr
                      key={String(label)}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <td style={{
                        padding: '10px 0', color: 'rgba(226,234,244,0.50)',
                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                        paddingLeft: '8px',
                      }}>
                        {label}
                      </td>
                      <td style={{
                        padding: '10px 8px', fontWeight: 700, color: '#E2EAF4', textAlign: 'right',
                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                      }}>
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── DemoInner ─────────────────────────────────────────────────────────────────

function DemoInner() {
  const navigate = useNavigate()
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)

  // ── Conversion tracking ──────────────────────────────────────────────────
  useEffect(() => {
    supabase.from('waitlist').insert({
      email: 'demo_view_' + Date.now(),
      source: 'demo',
    }).then(null, () => {})
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#0A0E1B', color: '#E2EAF4' }}>
      {/* Top banner */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#F5A623',
        padding: '10px 16px',
        textAlign: 'center',
        fontSize: '13px', fontWeight: 600, color: '#0A0E1B',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
      }}>
        <span>👁 Mode démo · Données fictives · Créez un compte gratuit</span>
        <button
          onClick={() => navigate('/register?source=demo')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#0A0E1B', fontWeight: 800, fontSize: 'inherit', fontFamily: 'inherit',
            borderBottom: '1.5px solid rgba(10,14,27,0.40)',
            marginLeft: '4px', padding: 0,
          }}
        >
          →
        </button>
      </div>

      {/* App header */}
      <header style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#0E1525',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <VizionLogo size="md" />
          <span style={{
            fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
            background: 'rgba(245,166,35,0.15)', color: '#F5A623',
            border: '1px solid rgba(245,166,35,0.30)',
            letterSpacing: '0.06em',
          }}>
            DÉMO
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => navigate('/?section=pricing')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'rgba(255,255,255,0.07)', color: 'rgba(226,234,244,0.75)',
              border: '1px solid rgba(255,255,255,0.12)',
              padding: '8px 16px', borderRadius: '8px',
              fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Voir les tarifs
          </button>
          <button
            onClick={() => navigate('/register?source=demo')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: '#00C896', color: '#0A0E1B',
              border: 'none',
              padding: '8px 18px', borderRadius: '8px',
              fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <UserPlus size={14} />
            Commencer gratuitement
          </button>
        </div>
      </header>

      {/* Content */}
      {selectedPlayer ? (
        <DemoPlayerDetail
          player={selectedPlayer}
          onBack={() => setSelectedPlayer(null)}
        />
      ) : (
        <DemoPlayerList onSelectPlayer={setSelectedPlayer} />
      )}
    </div>
  )
}

// ── Demo (default export) ─────────────────────────────────────────────────────

export default function Demo() {
  return (
    <DemoProvider>
      <DemoInner />
    </DemoProvider>
  )
}
