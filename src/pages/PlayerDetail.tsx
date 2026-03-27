import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useIsMobile } from '../hooks/useIsMobile'
import { usePlayerHistory } from '../hooks/usePlayerHistory'
import {
  ArrowLeft, Scale, CheckCircle, FileDown, Loader2, Heart, Sparkles, Send,
  TrendingUp, TrendingDown, RefreshCw, FileText, Mic, MicOff,
} from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { calculateScore, getScoreLabel, getRadarAxes, getPosGroup } from '../utils/scoring'
import type { PosGroup } from '../utils/scoring'
import { useScoringProfile } from '../hooks/useScoringProfile'
import { useScoutReport } from '../hooks/useScoutReport'
import { useSimilarPlayers } from '../hooks/useSimilarPlayers'
import SimilarPlayers from '../components/SimilarPlayers'
import { useCompare } from '../contexts/CompareContext'
import { PlayerPDFReport } from '../components/PlayerPDFReport'
import { exportPlayerPDF } from '../utils/exportPDF'
import type { Player } from '../types/player'
import type { ScoutNote } from '../components/PlayerPDFReport'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatMarketValue(eur: number): string {
  if (eur >= 1_000_000_000) return `${(eur / 1_000_000_000).toFixed(1).replace('.0', '')}Md €`
  if (eur >= 1_000_000)     return `${(eur / 1_000_000).toFixed(1).replace('.0', '')}M €`
  if (eur >= 1_000)         return `${Math.round(eur / 1_000)}k €`
  return `${eur} €`
}

// ── Position theming ───────────────────────────────────────────────────────────

const POS_COLOR: Record<PosGroup, string> = {
  GK:  '#F5A623',
  DEF: '#4D7FFF',
  MID: '#00C896',
  ATT: '#ef4444',
}

const POS_GRADIENT: Record<PosGroup, string> = {
  GK:  'linear-gradient(135deg, rgba(245,166,35,0.16) 0%, rgba(10,14,27,0) 65%)',
  DEF: 'linear-gradient(135deg, rgba(77,127,255,0.16) 0%, rgba(10,14,27,0) 65%)',
  MID: 'linear-gradient(135deg, rgba(0,200,150,0.16) 0%, rgba(10,14,27,0) 65%)',
  ATT: 'linear-gradient(135deg, rgba(239,68,68,0.16) 0%, rgba(10,14,27,0) 65%)',
}

const LABEL_COLOR: Record<string, string> = {
  'ELITE':        '#00C896',
  'TOP PROSPECT': '#4D7FFF',
  'INTERESTING':  '#F5A623',
  'TO MONITOR':   '#9B6DFF',
  'LOW PRIORITY': '#5A7090',
}

const AXIS_COLOR: Record<string, string> = {
  Technique: '#4D7FFF',
  Physical:  '#00C896',
  Pace:      '#22D4E8',
  Mental:    '#9B6DFF',
  Tactical:  '#F5A623',
  Potential: '#ec4899',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(v: unknown, decimals = 1): string {
  const n = Number(v)
  return isNaN(n) || n === 0 ? '—' : n.toFixed(decimals)
}

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 7) return `il y a ${days} j`
  if (days < 30) return `il y a ${Math.floor(days / 7)} sem.`
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

const NATIONALITY_FLAGS: Record<string, string> = {
  France: '🇫🇷', Spain: '🇪🇸', England: '🇬🇧', Germany: '🇩🇪', Italy: '🇮🇹',
  Portugal: '🇵🇹', Brazil: '🇧🇷', Argentina: '🇦🇷', Netherlands: '🇳🇱',
  Belgium: '🇧🇪', Croatia: '🇭🇷', Morocco: '🇲🇦', Senegal: '🇸🇳',
  Nigeria: '🇳🇬', 'United States': '🇺🇸', Mexico: '🇲🇽', Japan: '🇯🇵',
  'South Korea': '🇰🇷', Colombia: '🇨🇴', Uruguay: '🇺🇾',
}

function flagFor(nationality: string | null): string {
  if (!nationality) return ''
  return NATIONALITY_FLAGS[nationality] ? ` ${NATIONALITY_FLAGS[nationality]}` : ''
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ScoreRingLarge({ score, color, size = 120 }: { score: number; color: string; size?: number }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 200)
    return () => clearTimeout(t)
  }, [])

  const r = size === 90 ? 37 : 50
  const cx = size / 2
  const circ = 2 * Math.PI * r
  const fill = ((score ?? 0) / 100) * circ

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={8} />
      <circle
        cx={cx} cy={cx} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={circ}
        strokeDashoffset={animated ? circ - fill : circ}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{
          transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
          filter: `drop-shadow(0 0 8px ${color})`,
        }}
      />
      <text
        x={cx} y={cx - 3}
        textAnchor="middle"
        fill="var(--text-primary)"
        fontSize={size === 90 ? 22 : 30}
        fontWeight={700}
        fontFamily="var(--font-mono)"
      >
        {score ?? '—'}
      </text>
      <text
        x={cx} y={cx + 13}
        textAnchor="middle"
        fill="var(--text-muted)"
        fontSize={10}
        fontFamily="var(--font-mono)"
      >
        /100
      </text>
    </svg>
  )
}

interface StatBarProps {
  label: string
  value: number
  color: string
  ready: boolean
}

function StatBar({ label, value, color, ready }: StatBarProps) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {label}
        </span>
        <span style={{ fontSize: '13px', fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>
          {value ?? 0}
        </span>
      </div>
      <div style={{
        height: '5px',
        borderRadius: '3px',
        background: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: ready ? `${Math.min(value ?? 0, 100)}%` : '0%',
          background: color,
          borderRadius: '3px',
          transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: `0 0 8px ${color}80`,
        }} />
      </div>
    </div>
  )
}

function CustomRadarTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  return (
    <text
      x={x} y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      fill={AXIS_COLOR[payload?.value ?? ''] ?? 'var(--text-muted)'}
      fontSize={11}
      fontFamily="var(--font-mono)"
      fontWeight={500}
    >
      {payload?.value}
    </text>
  )
}

function NoteCard({ note }: { note: ScoutNote }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '10px',
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-blue)' }}>
          Scout
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {relativeDate(note.created_at)}
        </span>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
        {note.content}
      </p>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PlayerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isSelected, toggle, ids: compareIds } = useCompare()
  const isMobile = useIsMobile()

  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState<ScoutNote[]>([])
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [prevMarketValue, setPrevMarketValue] = useState<number | null>(null)
  const [barsReady, setBarsReady] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const baseNoteRef = useRef('')  // text in textarea before recording starts

  const { snapshots, loading: historyLoading } = usePlayerHistory(id)
  const { weights: scoringWeights } = useScoringProfile()
  const speech = useSpeechRecognition()
  const { report: aiReport, status: aiStatus, error: aiError, generateReport, reset: resetReport } = useScoutReport()
  const [includeInPDF, setIncludeInPDF] = useState(false)
  const { similar, loading: similarLoading } = useSimilarPlayers(player)

  useEffect(() => {
    if (!id) return
    supabase.from('players').select('*').eq('id', id).single()
      .then(({ data, error: err }) => {
        if (err || !data) setError('Joueur introuvable.')
        else setPlayer(data as Player)
        setLoading(false)
      })
    supabase.from('notes').select('id, content, created_at')
      .eq('player_id', id).order('created_at', { ascending: false }).limit(10)
      .then(({ data }) => { if (data) setNotes(data as ScoutNote[]) })
    // Fetch previous market value to show trend indicator
    supabase.from('market_value_history')
      .select('value_eur')
      .eq('player_id', id)
      .order('recorded_at', { ascending: false })
      .limit(2)
      .then(({ data }) => {
        if (data && data.length >= 2) setPrevMarketValue(data[1].value_eur as number)
      })
  }, [id])

  // Trigger bar animations after player loads
  useEffect(() => {
    if (!player) return
    const t = setTimeout(() => setBarsReady(true), 150)
    return () => clearTimeout(t)
  }, [player])

  // Sync live speech transcript into the textarea
  useEffect(() => {
    if (speech.isListening) {
      setNoteText(baseNoteRef.current + (speech.transcript ? ' ' + speech.transcript : ''))
    }
  }, [speech.transcript, speech.isListening])

  // Stop listening when the form is closed
  useEffect(() => {
    if (!showNoteForm && speech.isListening) speech.stopListening()
  }, [showNoteForm]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleExportPDF() {
    if (!reportRef.current || !player) return
    setPdfLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 400))
      await exportPlayerPDF(reportRef.current, player.name)
    } catch (err) {
      console.error('PDF export failed:', err)
      alert('Erreur lors de la génération du PDF.')
    } finally {
      setPdfLoading(false)
    }
  }

  async function handleAddNote() {
    if (!noteText.trim() || !id) return
    setSavingNote(true)
    const { data, error: err } = await supabase
      .from('notes')
      .insert({ player_id: id, content: noteText.trim() })
      .select('id, content, created_at')
      .single()
    setSavingNote(false)
    if (!err && data) {
      setNotes(prev => [data as ScoutNote, ...prev])
      setNoteText('')
      setShowNoteForm(false)
    }
  }

  // ── States ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', padding: '48px 0' }}>
        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>Chargement…</span>
      </div>
    )
  }

  if (error || !player) {
    return (
      <div style={{ padding: '48px 0' }}>
        <p style={{ color: '#ef4444', marginBottom: '16px', fontSize: '14px' }}>{error || 'Joueur introuvable.'}</p>
        <button
          onClick={() => navigate('/players')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: 0 }}
        >
          <ArrowLeft size={14} /> Retour aux joueurs
        </button>
      </div>
    )
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const score      = calculateScore(player, scoringWeights[getPosGroup(player.primary_position)])
  const label      = getScoreLabel(score)
  const posGroup   = getPosGroup(player.primary_position)
  const posColor   = POS_COLOR[posGroup]
  const labelColor = LABEL_COLOR[label] ?? '#5A7090'
  const initials   = (player.name || '?').split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()

  const radarData = player.individual_stats
    ? getRadarAxes(player.primary_position).map(axis => ({
        stat: axis,
        value: player.individual_stats![axis.toLowerCase() as keyof typeof player.individual_stats] ?? 0,
      }))
    : []

  const statBars = player.individual_stats
    ? getRadarAxes(player.primary_position).map(axis => ({
        label: axis,
        value: (player.individual_stats![axis.toLowerCase() as keyof typeof player.individual_stats] as number) ?? 0,
        color: AXIS_COLOR[axis] ?? posColor,
      }))
    : []

  // ── Progression data ────────────────────────────────────────────────────────
  const chartData = snapshots.map(s => ({
    date: new Date(s.snapshot_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
    score: s.overall_score,
  }))
  const scoreDelta = snapshots.length >= 2
    ? snapshots[snapshots.length - 1].overall_score - snapshots[snapshots.length - 2].overall_score
    : null

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ color: 'var(--text-primary)', maxWidth: '1000px', animation: 'fadeIn 0.25s ease' }}>

      {/* Hidden PDF template */}
      <PlayerPDFReport
        ref={reportRef}
        player={player}
        notes={notes}
        aiReport={includeInPDF ? aiReport : null}
      />

      {/* ── HERO CARD ─────────────────────────────────────────────────────── */}
      <div style={{
        background: `var(--bg-surface)`,
        backgroundImage: POS_GRADIENT[posGroup],
        borderRadius: '16px',
        border: `1px solid ${posColor}22`,
        padding: '28px',
        marginBottom: '20px',
        boxShadow: `0 0 40px ${posColor}18`,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative glow orb */}
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '180px', height: '180px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${posColor}20, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        {/* Back button */}
        <button
          onClick={() => navigate('/players')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            color: 'var(--text-muted)', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: '13px', padding: 0, marginBottom: '20px',
            transition: 'color 150ms ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <ArrowLeft size={14} /> Retour
        </button>

        {/* Hero content */}
        <div style={{
          display: 'flex', gap: '24px', alignItems: isMobile ? 'center' : 'flex-start',
          flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row',
        }}>

          {/* Avatar — 72px mobile / 96px desktop */}
          <div style={{
            width: isMobile ? 72 : 96, height: isMobile ? 72 : 96, borderRadius: '50%', flexShrink: 0,
            alignSelf: isMobile ? 'center' : 'flex-start',
            background: `radial-gradient(circle at 35% 35%, ${posColor}55, ${posColor}22)`,
            border: `2px solid ${posColor}55`,
            boxShadow: `0 0 24px ${posColor}50, 0 0 8px ${posColor}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', fontWeight: 700, color: 'white',
            fontFamily: 'var(--font-ui)',
          }}>
            {initials}
          </div>

          {/* Player info */}
          <div style={{ flex: 1, minWidth: '200px', textAlign: isMobile ? 'center' : 'left' }}>
            {/* Name */}
            <h1 style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 700, margin: '0 0 8px', lineHeight: 1.1, color: 'var(--text-primary)' }}>
              {player.name}
            </h1>

            {/* Line 1: position + club + nationality */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px', justifyContent: isMobile ? 'center' : 'flex-start' }}>
              <span style={{
                background: `${posColor}22`, color: posColor,
                fontSize: '11px', fontWeight: 700, padding: '3px 10px',
                borderRadius: 'var(--radius-badge)', fontFamily: 'var(--font-mono)',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                border: `1px solid ${posColor}40`,
              }}>
                {player.primary_position}
              </span>
              {player.team && (
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{player.team}</span>
              )}
              {player.nationality && (
                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                  {flagFor(player.nationality)}{player.nationality}
                </span>
              )}
            </div>

            {/* Line 2: age + foot + league */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '20px', justifyContent: isMobile ? 'center' : 'flex-start' }}>
              {player.age && (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: 'var(--text-secondary)', marginRight: '4px' }}>Âge</span>{player.age}
                </span>
              )}
              {player.foot && (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: 'var(--text-secondary)', marginRight: '4px' }}>Pied</span>{player.foot}
                </span>
              )}
              {player.competition && (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: 'var(--text-secondary)', marginRight: '4px' }}>Ligue</span>{player.competition}
                </span>
              )}
              {player.market_value_eur != null && (() => {
                const formatted = formatMarketValue(player.market_value_eur)
                const delta = prevMarketValue != null ? player.market_value_eur - prevMarketValue : null
                return (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{
                      fontSize: '13px', fontFamily: 'var(--font-mono)', fontWeight: 700,
                      color: '#F5A623',
                      background: 'rgba(245,166,35,0.10)',
                      border: '1px solid rgba(245,166,35,0.25)',
                      borderRadius: '6px', padding: '2px 8px',
                    }}>
                      {formatted}
                    </span>
                    {delta !== null && delta !== 0 && (
                      <span style={{
                        fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 600,
                        color: delta > 0 ? '#00C896' : '#ef4444',
                      }}>
                        {delta > 0 ? '↑' : '↓'} {formatMarketValue(Math.abs(delta))}
                      </span>
                    )}
                  </span>
                )
              })()}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start' }}>

              {/* Shortlist */}
              <button
                onClick={() => navigate('/shortlist')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.25)',
                  borderRadius: '8px', color: '#ec4899', fontSize: '12px', fontWeight: 600,
                  padding: '7px 14px', cursor: 'pointer', transition: 'all 150ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(236,72,153,0.16)'; e.currentTarget.style.borderColor = 'rgba(236,72,153,0.5)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(236,72,153,0.08)'; e.currentTarget.style.borderColor = 'rgba(236,72,153,0.25)' }}
              >
                <Heart size={13} /> Shortlist
              </button>

              {/* Comparer */}
              <button
                onClick={() => player && (compareIds.length < 3 || isSelected(player.id)) && toggle(player.id)}
                disabled={compareIds.length >= 3 && !isSelected(player?.id ?? '')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: isSelected(player?.id ?? '') ? 'rgba(0,200,150,0.12)' : 'rgba(77,127,255,0.08)',
                  border: `1px solid ${isSelected(player?.id ?? '') ? 'rgba(0,200,150,0.35)' : 'rgba(77,127,255,0.25)'}`,
                  borderRadius: '8px',
                  color: isSelected(player?.id ?? '') ? '#00C896' : '#4D7FFF',
                  fontSize: '12px', fontWeight: 600,
                  padding: '7px 14px', cursor: compareIds.length >= 3 && !isSelected(player?.id ?? '') ? 'not-allowed' : 'pointer',
                  opacity: compareIds.length >= 3 && !isSelected(player?.id ?? '') ? 0.5 : 1,
                  transition: 'all 150ms ease',
                }}
              >
                {isSelected(player?.id ?? '') ? <><CheckCircle size={13} /> Comparateur</> : <><Scale size={13} /> Comparer</>}
              </button>

              {/* Rapport IA */}
              <button
                onClick={() => alert('Fonctionnalité bientôt disponible.')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(155,109,255,0.08)', border: '1px solid rgba(155,109,255,0.25)',
                  borderRadius: '8px', color: '#9B6DFF', fontSize: '12px', fontWeight: 600,
                  padding: '7px 14px', cursor: 'pointer', transition: 'all 150ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(155,109,255,0.16)'; e.currentTarget.style.borderColor = 'rgba(155,109,255,0.5)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(155,109,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(155,109,255,0.25)' }}
              >
                <Sparkles size={13} /> Rapport IA
              </button>

              {/* PDF */}
              <button
                onClick={handleExportPDF}
                disabled={pdfLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: '8px', color: pdfLoading ? 'var(--text-muted)' : 'var(--text-secondary)',
                  fontSize: '12px', fontWeight: 600,
                  padding: '7px 14px', cursor: pdfLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={e => { if (!pdfLoading) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              >
                {pdfLoading
                  ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Génération…</>
                  : <><FileDown size={13} /> PDF</>
                }
              </button>
            </div>
          </div>

          {/* Score ring + label + progression badge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0, alignSelf: isMobile ? 'center' : 'flex-start' }}>
            <ScoreRingLarge score={score} color={labelColor} size={isMobile ? 90 : 120} />
            <span style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
              color: labelColor, fontFamily: 'var(--font-mono)',
              padding: '3px 10px', borderRadius: '20px',
              background: `${labelColor}18`,
              border: `1px solid ${labelColor}35`,
              boxShadow: `0 0 12px ${labelColor}25`,
            }}>
              {label}
            </span>
            {/* Progression badge — shown only when delta > 5 */}
            {scoreDelta !== null && Math.abs(scoreDelta) > 5 && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-mono)',
                color: scoreDelta > 0 ? '#00C896' : '#ef4444',
                background: scoreDelta > 0 ? 'rgba(0,200,150,0.12)' : 'rgba(239,68,68,0.12)',
                border: `1px solid ${scoreDelta > 0 ? 'rgba(0,200,150,0.30)' : 'rgba(239,68,68,0.30)'}`,
                borderRadius: '20px',
                padding: '3px 10px',
              }}>
                {scoreDelta > 0
                  ? <TrendingUp size={11} />
                  : <TrendingDown size={11} />
                }
                {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta} pts
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── STATS SECTION ─────────────────────────────────────────────────────── */}
      {radarData.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '20px' }}>

          {/* Radar chart */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '14px',
            padding: '24px',
          }}>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.15em',
              textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '16px',
            }}>
              Profil joueur
            </p>
            <div style={{ filter: `drop-shadow(0 0 10px ${posColor}50)` }}>
              <ResponsiveContainer width="100%" height={isMobile ? 280 : 260}>
                <RadarChart data={radarData} margin={{ top: 14, right: 24, bottom: 14, left: 24 }}>
                  <PolarGrid stroke="rgba(255,255,255,0.07)" />
                  <PolarAngleAxis dataKey="stat" tick={CustomRadarTick as any} />
                  <Radar
                    dataKey="value"
                    fill={posColor}
                    fillOpacity={0.15}
                    stroke={posColor}
                    strokeWidth={2}
                    dot={{ fill: posColor, r: 3, strokeWidth: 0 }}
                    style={{ filter: `drop-shadow(0 0 4px ${posColor})` }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stat bars */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '14px',
            padding: '24px',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.15em',
              textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '20px',
            }}>
              Scores par axe
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {statBars.map(({ label: axisLabel, value, color }) => (
                <StatBar
                  key={axisLabel}
                  label={axisLabel}
                  value={value}
                  color={color}
                  ready={barsReady}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── RAW STATS ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '14px',
        padding: '24px',
        marginBottom: '20px',
      }}>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '20px',
        }}>
          Statistiques brutes
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { label: 'Matchs',           value: fmt(player.appearances, 0) },
            { label: 'Minutes',          value: fmt(player.minutes_played, 0) },
            { label: 'Buts',             value: fmt(player.goals, 0) },
            { label: 'Passes déc.',      value: fmt(player.assists, 0) },
            { label: 'xG',               value: fmt(player.xg) },
            { label: 'xA',               value: fmt(player.xa) },
            { label: 'SCA',              value: fmt(player.shot_creating_actions, 0) },
            { label: 'Tacles',           value: fmt(player.tackles, 0) },
            { label: 'Interceptions',    value: fmt(player.interceptions, 0) },
            { label: 'Blocs',            value: fmt(player.blocks, 0) },
            { label: 'Dégagements',      value: fmt(player.clearances, 0) },
            { label: 'Pressions',        value: fmt(player.pressures, 0) },
            { label: 'Réus. pression',   value: player.pressure_success_rate ? fmt(player.pressure_success_rate) + '%' : '—' },
            { label: 'Réus. passes',     value: player.pass_completion_rate ? fmt(player.pass_completion_rate) + '%' : '—' },
            { label: 'Passes prog.',     value: fmt(player.progressive_passes, 0) },
            { label: 'Passes clés',      value: fmt(player.key_passes, 0) },
          ].map(({ label: statLabel, value }) => (
            <div key={statLabel} style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '10px',
              padding: '12px 14px',
            }}>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
                {statLabel}
              </p>
              <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: 0 }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── PROGRESSION ──────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '14px',
        padding: '24px',
        marginBottom: '20px',
      }}>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.15em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '20px',
        }}>
          Progression
        </p>

        {historyLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            <span>Chargement…</span>
          </div>
        ) : chartData.length < 2 ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '6px' }}>
              Données insuffisantes — revenez dans quelques semaines
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              {chartData.length} / 2 snapshots disponibles
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: -10 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' } as any}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'var(--font-mono)' } as any}
                axisLine={false}
                tickLine={false}
                tickCount={5}
              />
              <Tooltip
                contentStyle={{
                  background: '#0D1525',
                  border: '1px solid rgba(255,255,255,0.10)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                }}
                formatter={(value: number) => [value, 'Score']}
                labelStyle={{ color: 'var(--text-muted)', marginBottom: '4px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke={labelColor}
                strokeWidth={2}
                dot={{ fill: labelColor, r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: labelColor, strokeWidth: 0 }}
                style={{ filter: `drop-shadow(0 0 6px ${labelColor}80)` }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── RAPPORT IA ────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid rgba(155,109,255,0.18)',
        borderRadius: '14px',
        padding: '24px',
        marginBottom: '20px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.15em',
              textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0,
            }}>
              Rapport IA
            </p>
            <span style={{
              fontSize: '9px', fontWeight: 700, color: '#9B6DFF',
              background: 'rgba(155,109,255,0.12)', border: '1px solid rgba(155,109,255,0.25)',
              borderRadius: '4px', padding: '2px 7px',
              fontFamily: 'var(--font-mono)',
            }}>
              Pro+
            </span>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {aiReport && (
              <>
                <button
                  onClick={() => setIncludeInPDF(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: includeInPDF ? 'rgba(0,200,150,0.12)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${includeInPDF ? 'rgba(0,200,150,0.30)' : 'rgba(255,255,255,0.10)'}`,
                    borderRadius: '8px',
                    color: includeInPDF ? '#00C896' : 'var(--text-muted)',
                    fontSize: '12px', fontWeight: 600, padding: '6px 12px',
                    cursor: 'pointer', transition: 'all 150ms ease',
                  }}
                >
                  <FileText size={12} />
                  {includeInPDF ? 'Dans le PDF ✓' : 'Inclure dans le PDF'}
                </button>
                <button
                  onClick={() => { resetReport(); setIncludeInPDF(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: '8px', color: 'var(--text-muted)',
                    fontSize: '12px', fontWeight: 600, padding: '6px 12px',
                    cursor: 'pointer', transition: 'all 150ms ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <RefreshCw size={12} /> Régénérer
                </button>
              </>
            )}

            {aiStatus !== 'success' && (
              <button
                onClick={() => generateReport(player)}
                disabled={aiStatus === 'loading'}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: aiStatus === 'loading'
                    ? 'rgba(155,109,255,0.08)'
                    : 'linear-gradient(135deg, rgba(155,109,255,0.20), rgba(77,127,255,0.20))',
                  border: '1px solid rgba(155,109,255,0.35)',
                  borderRadius: '8px',
                  color: aiStatus === 'loading' ? 'var(--text-muted)' : '#9B6DFF',
                  fontSize: '13px', fontWeight: 700, padding: '8px 18px',
                  cursor: aiStatus === 'loading' ? 'not-allowed' : 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                {aiStatus === 'loading' ? (
                  <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Analyse en cours…</>
                ) : (
                  <><Sparkles size={14} /> Générer rapport IA</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        {aiStatus === 'idle' && (
          <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)' }}>
            <Sparkles size={28} style={{ opacity: 0.25, marginBottom: '10px' }} />
            <p style={{ fontSize: '13px', marginBottom: '4px' }}>
              Génère un rapport de scouting professionnel en quelques secondes.
            </p>
            <p style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', opacity: 0.6 }}>
              Alimenté par Claude — analyse basée sur les stats réelles
            </p>
          </div>
        )}

        {aiStatus === 'loading' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '28px 0', color: 'var(--text-muted)', justifyContent: 'center' }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: '#9B6DFF' }} />
            <span style={{ fontSize: '13px' }}>Analyse en cours…</span>
          </div>
        )}

        {aiStatus === 'error' && (
          <div style={{
            padding: '16px', borderRadius: '10px',
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)',
            color: '#ef4444', fontSize: '13px',
          }}>
            Erreur : {aiError}
          </div>
        )}

        {aiStatus === 'success' && aiReport && (
          <div style={{
            padding: '20px',
            background: 'rgba(155,109,255,0.05)',
            border: '1px solid rgba(155,109,255,0.15)',
            borderLeft: '3px solid #9B6DFF',
            borderRadius: '10px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
            animation: 'fadeIn 0.3s ease',
          }}>
            {aiReport}
          </div>
        )}
      </div>

      {/* ── SCOUT NOTES ───────────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '14px',
        padding: '24px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.15em',
            textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0,
          }}>
            Notes de scouting
            {notes.length > 0 && (
              <span style={{
                marginLeft: '8px',
                background: 'rgba(77,127,255,0.15)',
                color: 'var(--accent-blue)',
                borderRadius: '20px',
                padding: '1px 7px',
                fontSize: '10px',
                fontWeight: 700,
              }}>
                {notes.length}
              </span>
            )}
          </p>
          <button
            onClick={() => { setShowNoteForm(v => !v); setTimeout(() => textareaRef.current?.focus(), 50) }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: showNoteForm ? 'rgba(77,127,255,0.15)' : 'rgba(77,127,255,0.08)',
              border: '1px solid rgba(77,127,255,0.25)',
              borderRadius: '8px', color: 'var(--accent-blue)',
              fontSize: '12px', fontWeight: 600, padding: '6px 12px',
              cursor: 'pointer', transition: 'all 150ms ease',
            }}
          >
            {showNoteForm ? '✕ Annuler' : '+ Ajouter'}
          </button>
        </div>

        {/* Note form */}
        {showNoteForm && (
          <div style={{ marginBottom: '20px', animation: 'fadeIn 0.2s ease' }}>
            {/* Textarea + mic button row */}
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <textarea
                ref={textareaRef}
                value={noteText}
                onChange={e => {
                  setNoteText(e.target.value)
                  if (!speech.isListening) baseNoteRef.current = e.target.value
                  e.target.style.height = 'auto'
                  e.target.style.height = e.target.scrollHeight + 'px'
                }}
                placeholder={speech.isListening ? 'En écoute…' : "Observations, remarques, points d'attention…"}
                rows={3}
                style={{
                  width: '100%',
                  background: speech.isListening
                    ? 'rgba(239,68,68,0.05)'
                    : 'rgba(255,255,255,0.03)',
                  border: speech.isListening
                    ? '1px solid rgba(239,68,68,0.40)'
                    : '1px solid rgba(255,255,255,0.10)',
                  borderRadius: '10px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  padding: '12px 44px 12px 14px',
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'var(--font-ui)',
                  transition: 'border-color 150ms ease, box-shadow 150ms ease',
                  boxSizing: 'border-box',
                }}
                onFocus={e => {
                  if (!speech.isListening) {
                    e.target.style.borderColor = 'rgba(77,127,255,0.50)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(77,127,255,0.12)'
                  }
                }}
                onBlur={e => {
                  if (!speech.isListening) {
                    e.target.style.borderColor = 'rgba(255,255,255,0.10)'
                    e.target.style.boxShadow = 'none'
                  }
                }}
              />
              {/* Mic button — top-right of textarea */}
              <button
                title={!speech.isSupported ? 'Non supporté par ce navigateur' : speech.isListening ? 'Arrêter la dictée' : 'Dicter une note'}
                disabled={!speech.isSupported}
                onClick={() => {
                  if (speech.isListening) {
                    speech.stopListening()
                  } else {
                    baseNoteRef.current = noteText
                    speech.clearTranscript()
                    speech.startListening()
                  }
                }}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: speech.isListening
                    ? 'rgba(239,68,68,0.15)'
                    : 'rgba(255,255,255,0.06)',
                  border: speech.isListening
                    ? '1px solid rgba(239,68,68,0.40)'
                    : '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '7px',
                  color: speech.isListening ? '#ef4444' : speech.isSupported ? 'var(--text-muted)' : 'rgba(255,255,255,0.20)',
                  cursor: speech.isSupported ? 'pointer' : 'not-allowed',
                  transition: 'all 150ms ease',
                  animation: speech.isListening ? 'pulse 1.4s ease-in-out infinite' : 'none',
                  flexShrink: 0,
                }}
              >
                {speech.isListening ? <MicOff size={13} /> : <Mic size={13} />}
              </button>
            </div>
            {/* Listening indicator */}
            {speech.isListening && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                marginBottom: '10px',
                color: '#ef4444', fontSize: '11px', fontWeight: 600,
              }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: '#ef4444',
                  animation: 'pulse 1.4s ease-in-out infinite',
                  flexShrink: 0,
                }} />
                En écoute…
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleAddNote}
                disabled={!noteText.trim() || savingNote}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  background: noteText.trim() ? 'var(--accent-blue)' : 'rgba(77,127,255,0.20)',
                  border: 'none', borderRadius: '8px',
                  color: noteText.trim() ? 'white' : 'var(--text-muted)',
                  fontSize: '13px', fontWeight: 600, padding: '8px 16px',
                  cursor: noteText.trim() && !savingNote ? 'pointer' : 'not-allowed',
                  transition: 'all 150ms ease',
                }}
              >
                {savingNote
                  ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Enregistrement…</>
                  : <><Send size={13} /> Enregistrer</>
                }
              </button>
            </div>
          </div>
        )}

        {/* Notes list */}
        {notes.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {notes.map(note => <NoteCard key={note.id} note={note} />)}
          </div>
        ) : (
          <div style={{
            textAlign: 'center', padding: '32px 0',
            color: 'var(--text-muted)', fontSize: '13px',
          }}>
            <p style={{ marginBottom: '4px' }}>Aucune note pour ce joueur.</p>
            <p style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              Ajoutez vos observations de scouting.
            </p>
          </div>
        )}
      </div>

      {/* ── SIMILAR PLAYERS ───────────────────────────────────────────────────── */}
      <SimilarPlayers similar={similar} loading={similarLoading} />

    </div>
  )
}
