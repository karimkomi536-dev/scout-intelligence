import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { calculateScore, getScoreLabel } from '../utils/scoring'
import type { ShortlistGroup, ShortlistEntry, Tag } from '../types/shortlist'

const labelColors: Record<string, string> = {
  'ELITE':        '#10F090',
  'TOP PROSPECT': '#3b82f6',
  'INTERESTING':  '#eab308',
  'TO MONITOR':   '#f97316',
  'LOW PRIORITY': '#6b7280',
}

const positionColors: Record<string, string> = {
  ST: '#ef4444', RW: '#f97316', LW: '#f97316',
  CM: '#3b82f6', CAM: '#8b5cf6', CDM: '#6366f1',
  CB: '#22c55e', LB: '#10b981', RB: '#10b981',
  GK: '#eab308',
}

function TagChip({ tag }: { tag: Tag }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: tag.color + '22', color: tag.color,
      fontSize: '11px', fontWeight: 600,
      padding: '2px 8px', borderRadius: '4px',
    }}>
      {tag.label}
    </span>
  )
}

export default function SharedShortlist() {
  const { token } = useParams<{ token: string }>()
  const [group, setGroup] = useState<ShortlistGroup | null>(null)
  const [entries, setEntries] = useState<ShortlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return

    async function load() {
      // 1. Look up share token
      const { data: share, error: shareErr } = await supabase
        .from('shortlist_shares')
        .select('list_id, expires_at')
        .eq('token', token)
        .single()

      if (shareErr || !share) {
        setError('Lien invalide ou expiré.')
        setLoading(false)
        return
      }

      // 2. Check expiry
      if (share.expires_at && new Date(share.expires_at) < new Date()) {
        setError('Ce lien de partage a expiré.')
        setLoading(false)
        return
      }

      // 3. Load group name (may fail for anon if RLS blocks it — graceful fallback)
      const { data: grp } = await supabase
        .from('shortlist_groups')
        .select('*')
        .eq('id', share.list_id)
        .maybeSingle()

      setGroup(grp as ShortlistGroup | null)

      // 4. Load entries + player data
      const { data: rows, error: rowsErr } = await supabase
        .from('shortlists')
        .select('*, players(*)')
        .eq('list_id', share.list_id)
        .order('position_index', { ascending: true })

      if (rowsErr) {
        setError('Erreur lors du chargement des joueurs.')
        setLoading(false)
        return
      }

      setEntries((rows ?? []) as ShortlistEntry[])
      setLoading(false)
    }

    load()
  }, [token])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6b7280' }}>Chargement…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0f1a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <p style={{ color: '#ef4444', fontSize: '16px' }}>{error}</p>
        <Link to="/" style={{ color: '#3b82f6', fontSize: '14px' }}>← Retour à l'accueil</Link>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1a', color: 'white', padding: '40px 24px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: '#3b82f6', textTransform: 'uppercase' }}>VIZION</span>
            <span style={{ color: '#1f2937' }}>·</span>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>Liste partagée</span>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0 }}>{group?.name}</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '6px' }}>
            {entries.length} joueur{entries.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Player list */}
        {entries.length === 0 ? (
          <p style={{ color: '#4b5563', textAlign: 'center', padding: '48px 0' }}>Cette liste est vide.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {entries.map((entry, idx) => {
              const player = entry.players
              if (!player) return null

              const score = calculateScore(player)
              const label = getScoreLabel(score)
              const posColor = positionColors[player.primary_position] || '#6b7280'
              const labelColor = labelColors[label] || '#6b7280'
              const initials = (player.name || '?')
                .split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()

              return (
                <div
                  key={entry.id}
                  style={{
                    background: '#111827',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                  }}
                >
                  {/* Rank */}
                  <span style={{ fontSize: '13px', color: '#4b5563', fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>
                    {idx + 1}
                  </span>

                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: '#1f2937', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '13px', fontWeight: 700,
                    color: '#9ca3af', flexShrink: 0,
                  }}>
                    {initials}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '15px' }}>{player.name}</span>
                      <span style={{
                        background: posColor + '22', color: posColor,
                        fontSize: '11px', fontWeight: 600,
                        padding: '2px 8px', borderRadius: '4px',
                      }}>
                        {player.primary_position}
                      </span>
                      <span style={{
                        background: labelColor + '22', color: labelColor,
                        fontSize: '11px', fontWeight: 600,
                        padding: '2px 8px', borderRadius: '4px',
                      }}>
                        {label}
                      </span>
                    </div>
                    <p style={{ color: '#6b7280', fontSize: '12px', margin: '3px 0 0' }}>
                      {player.team}{player.competition ? ` · ${player.competition}` : ''}
                      {player.age ? ` · ${player.age} ans` : ''}
                    </p>
                    {entry.tags?.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {entry.tags.map(tag => <TagChip key={tag.id} tag={tag} />)}
                      </div>
                    )}
                  </div>

                  {/* Score */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{
                      fontSize: '22px', fontWeight: 700,
                      color: score >= 75 ? '#10F090' : score >= 50 ? '#3b82f6' : score >= 30 ? '#f97316' : '#6b7280',
                    }}>
                      {score}
                    </span>
                    <p style={{ fontSize: '10px', color: '#4b5563', margin: 0 }}>/100</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '40px', textAlign: 'center', color: '#374151', fontSize: '12px' }}>
          Partagé via <span style={{ color: '#3b82f6', fontWeight: 700 }}>VIZION</span>
          {' · '}
          <Link to="/" style={{ color: '#3b82f6' }}>Créer votre compte</Link>
        </div>
      </div>
    </div>
  )
}
