import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, TrendingUp, Users, Bookmark, CheckCheck } from 'lucide-react'
import { useNotifications } from '../hooks/useNotifications'
import type { Notification } from '../hooks/useNotifications'
import { useState } from 'react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `il y a ${d}j`
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

const TYPE_ICON: Record<Notification['type'], React.ReactNode> = {
  score_change:     <TrendingUp  size={13} />,
  new_player:       <Users       size={13} />,
  shortlist_update: <Bookmark    size={13} />,
}

const TYPE_COLOR: Record<Notification['type'], string> = {
  score_change:     '#4D7FFF',
  new_player:       '#00C896',
  shortlist_update: '#9B6DFF',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotificationBell() {
  const navigate = useNavigate()
  const { notifications, loading, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  function handleNotificationClick(n: Notification) {
    if (!n.read) markAsRead(n.id)
    if (n.player_id) {
      setOpen(false)
      navigate(`/players/${n.player_id}`)
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Notifications"
        style={{
          display: 'flex',
          background: open ? 'rgba(255,255,255,0.06)' : 'none',
          border: 'none',
          cursor: 'pointer',
          color: open ? 'var(--text-primary)' : 'var(--text-muted)',
          padding: '6px',
          borderRadius: '8px',
          position: 'relative',
          transition: 'all 150ms ease',
        }}
        onMouseEnter={e => {
          if (!open) e.currentTarget.style.color = 'var(--text-primary)'
        }}
        onMouseLeave={e => {
          if (!open) e.currentTarget.style.color = 'var(--text-muted)'
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '1px', right: '1px',
            minWidth: '16px', height: '16px',
            borderRadius: '8px',
            background: '#ef4444',
            border: '1.5px solid var(--bg-base)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '9px', fontWeight: 800, color: 'white',
            fontFamily: 'var(--font-mono)',
            lineHeight: 1,
            padding: '0 3px',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: '320px',
          background: '#0D1525',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: '14px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)',
          zIndex: 200,
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}>
            <span style={{
              fontSize: '13px', fontWeight: 700,
              color: 'var(--text-primary)',
            }}>
              Notifications
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: '8px',
                  background: 'rgba(77,127,255,0.15)', color: '#4D7FFF',
                  borderRadius: '20px', padding: '1px 7px',
                  fontSize: '10px', fontWeight: 700,
                }}>
                  {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </span>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                title="Tout marquer comme lu"
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600,
                  padding: '4px 8px', borderRadius: '6px',
                  transition: 'color 150ms ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#4D7FFF')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <CheckCheck size={12} />
                Tout lire
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                Chargement…
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>
                  Aucune notification
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                  Les alertes score apparaîtront ici
                </p>
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    display: 'flex', gap: '12px', alignItems: 'flex-start',
                    width: '100%', padding: '12px 16px',
                    background: n.read ? 'transparent' : 'rgba(77,127,255,0.05)',
                    border: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    cursor: n.player_id ? 'pointer' : 'default',
                    textAlign: 'left',
                    transition: 'background 150ms ease',
                  }}
                  onMouseEnter={e => {
                    if (n.player_id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(77,127,255,0.05)'
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
                    background: `${TYPE_COLOR[n.type]}18`,
                    border: `1px solid ${TYPE_COLOR[n.type]}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: TYPE_COLOR[n.type],
                    marginTop: '1px',
                  }}>
                    {TYPE_ICON[n.type]}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      {!n.read && (
                        <span style={{
                          width: '6px', height: '6px', borderRadius: '50%',
                          background: '#4D7FFF', flexShrink: 0,
                        }} />
                      )}
                      <span style={{
                        fontSize: '12px', fontWeight: n.read ? 500 : 700,
                        color: n.read ? 'var(--text-secondary)' : 'var(--text-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {n.title}
                      </span>
                    </div>
                    <p style={{
                      fontSize: '12px', color: 'var(--text-muted)', margin: 0,
                      lineHeight: 1.5,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {n.message}
                    </p>
                    <p style={{
                      fontSize: '10px', color: 'var(--text-muted)', margin: '4px 0 0',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {relativeTime(n.created_at)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
