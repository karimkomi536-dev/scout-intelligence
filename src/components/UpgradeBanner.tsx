import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X, Zap } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

export type UpgradeFeature =
  | 'export PDF'
  | 'rapport IA'
  | 'comparateur 3'
  | 'limite joueurs'

interface Props {
  feature: UpgradeFeature
  /** Optional override message */
  message?: string
  /** Render inline (no bottom margin) */
  compact?: boolean
}

// ── Dismiss helpers (24 h via localStorage) ───────────────────────────────────

function dismissKey(feature: UpgradeFeature) {
  return `vizion-upgrade-dismiss-${feature.replace(/\s/g, '-')}`
}

function isDismissed(feature: UpgradeFeature): boolean {
  const stored = localStorage.getItem(dismissKey(feature))
  return !!stored && Date.now() < Number(stored)
}

function dismiss(feature: UpgradeFeature) {
  localStorage.setItem(dismissKey(feature), String(Date.now() + 24 * 60 * 60 * 1000))
}

// ── Messages ──────────────────────────────────────────────────────────────────

const MESSAGES: Record<UpgradeFeature, string> = {
  'export PDF':      "L'export PDF est réservé au plan Pro.",
  'rapport IA':      'Le rapport IA est réservé au plan Pro.',
  'comparateur 3':   'Passez à Pro pour comparer jusqu\'à 3 joueurs simultanément.',
  'limite joueurs':  'Vous approchez la limite de 50 joueurs du plan gratuit.',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function UpgradeBanner({ feature, message, compact }: Props) {
  const [hidden, setHidden] = useState(() => isDismissed(feature))

  if (hidden) return null

  function handleDismiss() {
    dismiss(feature)
    setHidden(true)
  }

  return (
    <div style={{
      display:      'flex',
      alignItems:   'center',
      gap:          10,
      background:   'rgba(245,166,35,0.10)',
      border:       '1px solid rgba(245,166,35,0.28)',
      borderRadius: 10,
      padding:      '10px 14px',
      marginBottom: compact ? 0 : 16,
    }}>
      <Zap size={14} color="#F5A623" style={{ flexShrink: 0 }} />

      <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.80)', lineHeight: 1.4 }}>
        {message ?? MESSAGES[feature]}
      </span>

      <Link
        to="/settings/billing"
        style={{
          fontSize:        12,
          fontWeight:      700,
          color:           '#F5A623',
          textDecoration:  'none',
          whiteSpace:      'nowrap',
          background:      'rgba(245,166,35,0.12)',
          border:          '1px solid rgba(245,166,35,0.28)',
          borderRadius:    6,
          padding:         '4px 10px',
          flexShrink:      0,
        }}
      >
        Passer à Pro →
      </Link>

      <button
        onClick={handleDismiss}
        style={{
          background: 'none',
          border:     'none',
          cursor:     'pointer',
          color:      'rgba(255,255,255,0.35)',
          padding:    2,
          flexShrink: 0,
          display:    'flex',
        }}
        title="Masquer 24 h"
      >
        <X size={13} />
      </button>
    </div>
  )
}

// ── UpgradeModal — lightweight full-screen overlay ────────────────────────────

interface ModalProps {
  feature: UpgradeFeature
  onClose: () => void
}

export function UpgradeModal({ feature, onClose }: ModalProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position:       'fixed',
        inset:          0,
        background:     'rgba(0,0,0,0.65)',
        zIndex:         9000,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '20px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:   '#111A2E',
          border:       '1px solid rgba(155,109,255,0.30)',
          borderRadius: 16,
          padding:      '28px 24px',
          maxWidth:     340,
          width:        '100%',
          position:     'relative',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position:   'absolute',
            top:        14,
            right:      14,
            background: 'none',
            border:     'none',
            cursor:     'pointer',
            color:      'rgba(255,255,255,0.40)',
            display:    'flex',
          }}
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div style={{
          width:          44,
          height:         44,
          borderRadius:   10,
          background:     'rgba(155,109,255,0.12)',
          border:         '1px solid rgba(155,109,255,0.30)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          marginBottom:   16,
        }}>
          <Zap size={20} color="#9B6DFF" />
        </div>

        <p style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
          Fonctionnalité Pro
        </p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: '0 0 20px', lineHeight: 1.6 }}>
          {MESSAGES[feature]} Passez au plan Pro pour débloquer toutes les fonctionnalités.
        </p>

        <Link
          to="/settings/billing"
          onClick={onClose}
          style={{
            display:        'block',
            textAlign:      'center',
            background:     'linear-gradient(135deg, #9B6DFF, #4D7FFF)',
            borderRadius:   9,
            padding:        '11px 0',
            color:          '#fff',
            fontWeight:     700,
            fontSize:       14,
            textDecoration: 'none',
          }}
        >
          Voir les plans →
        </Link>
      </div>
    </div>
  )
}
