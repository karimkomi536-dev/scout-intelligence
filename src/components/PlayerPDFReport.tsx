/**
 * PlayerPDFReport — off-screen A4 template captured by html2canvas.
 *
 * Rendered at position: fixed; left: -9999px so it is in the DOM (required
 * by html2canvas) but never visible to the user.
 * Width: 794px = A4 at 96 dpi (210 mm).
 */

import { forwardRef } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts'
import { calculateScore, getScoreLabel, getRadarAxes } from '../utils/scoring'
import type { Player, IndividualStats } from '../types/player'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScoutNote {
  id: string
  content: string
  created_at: string
}

interface Props {
  player:    Player
  notes:     ScoutNote[]
  aiReport?: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PDF_W = 794   // A4 @ 96 dpi
const PAD   = 40

const LABEL_COLORS: Record<string, string> = {
  'ELITE':        '#059669',
  'TOP PROSPECT': '#2563eb',
  'INTERESTING':  '#d97706',
  'TO MONITOR':   '#ea580c',
  'LOW PRIORITY': '#6b7280',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Component ─────────────────────────────────────────────────────────────────

export const PlayerPDFReport = forwardRef<HTMLDivElement, Props>(({ player, notes, aiReport }, ref) => {
  const score = calculateScore(player)
  const label = getScoreLabel(score)
  const labelColor = LABEL_COLORS[label] || '#6b7280'
  const axes = getRadarAxes(player.primary_position)

  const radarData = axes.map(axis => ({
    stat: axis,
    value: player.individual_stats?.[axis.toLowerCase() as keyof IndividualStats] ?? 0,
  }))

  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: '-9999px',
        top: 0,
        width: `${PDF_W}px`,
        backgroundColor: '#ffffff',
        fontFamily: 'Arial, Helvetica, sans-serif',
        color: '#0f172a',
        // Isolate from page styles
        lineHeight: 1.4,
        fontSize: '14px',
      }}
    >
      {/* ── Watermark ───────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        top: '42%',
        left: '50%',
        transform: 'translate(-50%, -50%) rotate(-45deg)',
        fontSize: '88px',
        fontWeight: 900,
        color: 'rgba(0,0,0,0.035)',
        pointerEvents: 'none',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        zIndex: 0,
        letterSpacing: '0.1em',
      }}>
        CONFIDENTIEL
      </div>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        background: '#0f172a',
        padding: `24px ${PAD}px`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ color: '#10F090', fontSize: '22px', fontWeight: 900, letterSpacing: '0.05em' }}>VIZION</div>
          <div style={{ color: '#475569', fontSize: '11px', marginTop: '3px' }}>Football Scouting Intelligence</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#94a3b8', fontSize: '12px' }}>Rapport de scouting</div>
          <div style={{ color: '#475569', fontSize: '11px', marginTop: '3px' }}>{today}</div>
        </div>
      </div>

      {/* ── Player identity ─────────────────────────────────────────────── */}
      <div style={{
        padding: `24px ${PAD}px`,
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        background: '#f8fafc',
      }}>
        {/* Avatar */}
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: '#e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px', fontWeight: 700, color: '#334155',
          flexShrink: 0,
        }}>
          {initials(player.name)}
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '5px' }}>{player.name}</div>
          <div style={{ color: '#64748b', fontSize: '12px' }}>
            {[player.team, player.competition, player.age ? `${player.age} ans` : null, player.nationality, player.foot ? `Pied ${player.foot.toLowerCase()}` : null]
              .filter(Boolean).join(' · ')}
          </div>
        </div>

        {/* Score + Label + Position */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: '40px', fontWeight: 900, color: labelColor, lineHeight: 1 }}>{score}</div>
          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>/ 100</div>
          <div style={{
            marginTop: '8px',
            display: 'inline-block',
            background: labelColor + '18',
            color: labelColor,
            fontSize: '10px', fontWeight: 700,
            padding: '3px 10px', borderRadius: '99px',
          }}>
            {label}
          </div>
          <div style={{
            marginTop: '6px',
            display: 'inline-block',
            background: '#1e293b',
            color: '#94a3b8',
            fontSize: '10px', fontWeight: 700,
            padding: '3px 10px', borderRadius: '4px',
          }}>
            {player.primary_position}
          </div>
        </div>
      </div>

      {/* ── Radar + Stats ────────────────────────────────────────────────── */}
      <div style={{ padding: `24px ${PAD}px`, display: 'flex', gap: '32px', alignItems: 'flex-start' }}>

        {/* Radar chart — fixed dimensions, no ResponsiveContainer */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
            Profil radar
          </div>
          <RadarChart width={290} height={230} data={radarData} margin={{ top: 5, right: 25, bottom: 5, left: 25 }}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="stat" tick={{ fill: '#64748b', fontSize: 11 }} />
            <Radar dataKey="value" fill="#3b82f6" fillOpacity={0.2} stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
          </RadarChart>
        </div>

        {/* Stat bars — 6 radar axes */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>
            Indicateurs clés
          </div>
          {axes.map(axis => {
            const val = player.individual_stats?.[axis.toLowerCase() as keyof IndividualStats] ?? 0
            const color = val >= 70 ? '#059669' : val >= 45 ? '#2563eb' : '#94a3b8'
            return (
              <div key={axis} style={{ marginBottom: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '12px', color: '#334155', fontWeight: 500 }}>{axis}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{val}</span>
                </div>
                <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ height: '6px', width: `${val}%`, background: color, borderRadius: '999px' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Notes ───────────────────────────────────────────────────────── */}
      <div style={{ padding: `0 ${PAD}px 24px` }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
          Notes du scout
        </div>
        {notes.length === 0 ? (
          <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: '8px', color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>
            Aucune note disponible pour ce joueur.
          </div>
        ) : (
          notes.slice(0, 3).map((note, i) => (
            <div key={i} style={{
              padding: '12px 16px',
              background: '#f8fafc',
              borderRadius: '8px',
              marginBottom: '8px',
              borderLeft: '3px solid #3b82f6',
            }}>
              <div style={{ fontSize: '12px', color: '#334155' }}>{note.content}</div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '5px' }}>{formatDate(note.created_at)}</div>
            </div>
          ))
        )}
      </div>

      {/* ── AI Report ───────────────────────────────────────────────────── */}
      {aiReport && (
        <div style={{ padding: `0 ${PAD}px 24px` }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
            Rapport IA — Analyse VIZION
          </div>
          <div style={{
            padding: '16px',
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderLeft: '3px solid #0ea5e9',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#0f172a',
            lineHeight: 1.65,
            whiteSpace: 'pre-wrap',
          }}>
            {aiReport}
          </div>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div style={{
        background: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        padding: `14px ${PAD}px`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '10px', color: '#94a3b8' }}>
          Généré par VIZION · Football Scouting Intelligence · vizion.app
        </span>
        <span style={{ fontSize: '10px', color: '#cbd5e1' }}>
          © {new Date().getFullYear()} VIZION — Confidentiel
        </span>
      </div>
    </div>
  )
})

PlayerPDFReport.displayName = 'PlayerPDFReport'
