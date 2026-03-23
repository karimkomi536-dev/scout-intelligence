import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Bookmark, Newspaper, Upload, LogOut,
  Scale, Settings, Zap,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import CompareBar from './CompareBar'

// ── Nav config ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/players',    icon: Users,            label: 'Joueurs'   },
  { to: '/compare',    icon: Scale,            label: 'Comparateur' },
  { to: '/shortlist',  icon: Bookmark,         label: 'Shortlist' },
  { to: '/newsletter', icon: Newspaper,        label: 'Newsletter' },
  { to: '/upload',     icon: Upload,           label: 'Import'    },
]

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/players':    'Joueurs',
  '/compare':    'Comparateur',
  '/shortlist':  'Shortlist',
  '/newsletter': 'Newsletter',
  '/upload':     'Import',
}

// ── Avatar gradient by first letter ──────────────────────────────────────────

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#4D7FFF,#22D4E8)',
  'linear-gradient(135deg,#00C896,#22D4E8)',
  'linear-gradient(135deg,#9B6DFF,#4D7FFF)',
  'linear-gradient(135deg,#F5A623,#ef4444)',
  'linear-gradient(135deg,#ec4899,#9B6DFF)',
]
function avatarGradient(name: string) {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length
  return AVATAR_GRADIENTS[idx]
}

function formatDate() {
  return new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function Layout() {
  const { user, signOut } = useAuth()
  const location = useLocation()

  const displayName = user?.email?.split('@')[0] ?? 'Scout'
  const displayEmail = user?.email ?? ''
  const initials = displayName.slice(0, 2).toUpperCase()

  const pageTitle = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1] ?? 'VIZION'

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: 'var(--bg-base)' }}>

      {/* ══════════════════════════════════════════════════════════════════════
          SIDEBAR
      ══════════════════════════════════════════════════════════════════════ */}
      <aside style={{
        width: '260px',
        minWidth: '260px',
        height: '100vh',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* ── ZONE 1 : Logo ──────────────────────────────────────────────── */}
        <div style={{ padding: '22px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Zap size={18} color="var(--accent-green)" fill="var(--accent-green)" />
            <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              VIZION
            </span>
          </div>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--text-muted)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            Football Scouting
          </span>
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginTop: '16px' }} />
        </div>

        {/* ── ZONE 2 : User card ─────────────────────────────────────────── */}
        <div style={{ padding: '0 12px 4px' }}>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            {/* Avatar */}
            <div style={{
              width: '38px', height: '38px', borderRadius: '50%',
              background: avatarGradient(displayName),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 700, color: 'white', flexShrink: 0,
            }}>
              {initials}
            </div>

            {/* Name + email */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayEmail}
              </p>
            </div>

            {/* Settings icon */}
            <button
              title="Paramètres"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', flexShrink: 0, display: 'flex' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <Settings size={14} />
            </button>
          </div>
        </div>

        {/* ── ZONE 3 : Navigation ────────────────────────────────────────── */}
        <nav style={{ flex: 1, padding: '16px 12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--text-muted)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            padding: '0 8px 8px',
          }}>
            Menu
          </p>

          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '13.5px',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                background: isActive ? 'rgba(77,127,255,0.12)' : 'transparent',
                borderLeft: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
                transition: 'all 150ms ease',
              })}
              onMouseEnter={e => {
                const el = e.currentTarget
                if (!el.getAttribute('aria-current')) {
                  el.style.background = 'rgba(255,255,255,0.04)'
                  el.style.color = 'var(--text-primary)'
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget
                if (!el.getAttribute('aria-current')) {
                  el.style.background = 'transparent'
                  el.style.color = 'var(--text-secondary)'
                }
              }}
            >
              <Icon size={16} strokeWidth={isActiveCheck(to, location.pathname) ? 2.2 : 1.8} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* ── ZONE 4 : Footer ────────────────────────────────────────────── */}
        <div style={{ padding: '12px 12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

          {/* Plan badge — free tier CTA */}
          <div style={{
            background: 'rgba(245,166,35,0.08)',
            border: '1px solid rgba(245,166,35,0.20)',
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <Zap size={14} color="#F5A623" fill="#F5A623" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#F5A623', margin: 0 }}>Plan Free</p>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0 }}>Passer à Pro →</p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={signOut}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '9px 12px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '8px',
              color: 'var(--text-muted)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              width: '100%',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'
              e.currentTarget.style.color = '#ef4444'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            <LogOut size={14} />
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN AREA
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <header style={{
          height: '60px',
          minHeight: '60px',
          backgroundColor: 'var(--bg-base)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '0 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {pageTitle}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
            {formatDate()}
          </div>
        </header>

        {/* Content */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: '28px',
        }}>
          <Outlet />
        </main>
      </div>

      <CompareBar />
    </div>
  )
}

// helper — check active outside NavLink render prop
function isActiveCheck(to: string, pathname: string) {
  return pathname.startsWith(to)
}
