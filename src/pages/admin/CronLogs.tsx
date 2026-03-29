import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CronLog {
  id:              string
  type:            string
  status:          'success' | 'error'
  message:         string | null
  players_updated: number
  created_at:      string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

const TYPE_LABEL: Record<string, string> = {
  'update-players':  'Joueurs',
  'update-fixtures': 'Fixtures',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CronLogs() {
  const [logs,    setLogs]    = useState<CronLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  async function fetchLogs() {
    setLoading(true)
    setError(null)

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
    setLoading(false)
  }

  useEffect(() => { fetchLogs() }, [])

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Pipeline nocturne
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            10 dernières exécutions Vercel Cron
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          6,
            background:   'rgba(255,255,255,0.06)',
            border:       '1px solid rgba(255,255,255,0.10)',
            borderRadius: 8,
            padding:      '8px 14px',
            color:        'var(--text-muted)',
            fontSize:     13,
            fontWeight:   600,
            cursor:       loading ? 'not-allowed' : 'pointer',
            opacity:      loading ? 0.5 : 1,
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Actualiser
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background:   'rgba(239,68,68,0.10)',
          border:       '1px solid rgba(239,68,68,0.25)',
          borderRadius: 10,
          padding:      '12px 16px',
          color:        '#f87171',
          fontSize:     13,
          marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{
        background:   'rgba(255,255,255,0.03)',
        border:       '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        overflow:     'hidden',
      }}>
        {/* Header row */}
        <div style={{
          display:    'grid',
          gridTemplateColumns: '120px 90px 1fr 100px 160px',
          padding:    '10px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          fontSize:   11,
          fontWeight: 700,
          color:      'var(--text-muted)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          <span>Type</span>
          <span>Statut</span>
          <span>Message</span>
          <span style={{ textAlign: 'right' }}>Joueurs</span>
          <span style={{ textAlign: 'right' }}>Date</span>
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Chargement…
          </div>
        )}

        {/* Empty state */}
        {!loading && logs.length === 0 && !error && (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Aucun log. Les crons s'exécutent à 3h et 4h UTC.
          </div>
        )}

        {/* Log rows */}
        {!loading && logs.map((log, i) => (
          <div
            key={log.id}
            style={{
              display:    'grid',
              gridTemplateColumns: '120px 90px 1fr 100px 160px',
              padding:    '14px 20px',
              alignItems: 'center',
              borderTop:  i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
              background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
            }}
          >
            {/* Type badge */}
            <span style={{
              fontSize:     12,
              fontWeight:   700,
              color:        'var(--text-primary)',
              background:   'rgba(255,255,255,0.06)',
              borderRadius: 6,
              padding:      '3px 8px',
              width:        'fit-content',
            }}>
              {TYPE_LABEL[log.type] ?? log.type}
            </span>

            {/* Status badge */}
            <span style={{
              display:    'flex',
              alignItems: 'center',
              gap:        5,
              fontSize:   12,
              fontWeight: 700,
              color:      log.status === 'success' ? '#00C896' : '#f87171',
            }}>
              {log.status === 'success'
                ? <CheckCircle size={14} />
                : <XCircle    size={14} />
              }
              {log.status === 'success' ? 'OK' : 'Erreur'}
            </span>

            {/* Message */}
            <span style={{
              fontSize:   12,
              color:      'var(--text-muted)',
              overflow:   'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {log.message ?? '—'}
            </span>

            {/* Players updated */}
            <span style={{
              fontSize:   13,
              fontWeight: 600,
              color:      log.players_updated > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
              textAlign:  'right',
            }}>
              {log.players_updated > 0 ? `+${log.players_updated}` : '—'}
            </span>

            {/* Timestamp */}
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>
              {formatDate(log.created_at)}
            </span>
          </div>
        ))}
      </div>

      {/* Schedule info */}
      <div style={{
        marginTop:    16,
        padding:      '12px 16px',
        background:   'rgba(77,127,255,0.06)',
        border:       '1px solid rgba(77,127,255,0.15)',
        borderRadius: 10,
        fontSize:     12,
        color:        'var(--text-muted)',
        lineHeight:   1.6,
      }}>
        <strong style={{ color: '#4D7FFF' }}>Planification</strong>
        {' '}· Joueurs : <code style={{ color: 'var(--text-primary)' }}>0 3 * * *</code> (3h UTC)
        {' '}· Fixtures : <code style={{ color: 'var(--text-primary)' }}>0 4 * * *</code> (4h UTC)
      </div>
    </div>
  )
}
