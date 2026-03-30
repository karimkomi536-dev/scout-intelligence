import { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Bookmark, Newspaper, Upload, LogOut,
  Scale, Settings, Zap, X, Target, Download, Database,
} from 'lucide-react'
import VizionLogo from './VizionLogo'

// Browser install prompt event (not in standard TS lib)
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
import { useAuth } from '../contexts/AuthContext'
import { useOrganization } from '../hooks/useOrganization'
import CompareBar from './CompareBar'
import NotificationBell from './NotificationBell'
import CommandPalette from './CommandPalette'
import { useIsMobile } from '../hooks/useIsMobile'

// ── Nav config ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/players',    icon: Users,            label: 'Joueurs'   },
  { to: '/compare',    icon: Scale,            label: 'Comparateur' },
  { to: '/shortlist',  icon: Bookmark,         label: 'Shortlist' },
  { to: '/newsletter', icon: Newspaper,        label: 'Newsletter' },
  { to: '/upload',     icon: Upload,           label: 'Import'    },
  { to: '/settings',   icon: Settings,         label: 'Paramètres' },
  { to: '/shadow-team', icon: Target,          label: 'Shadow Team' },
]

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/players':    'Joueurs',
  '/compare':    'Comparateur',
  '/shortlist':  'Shortlist',
  '/newsletter': 'Newsletter',
  '/upload':     'Import',
  '/settings':   'Paramètres',
  '/shadow-team': 'Shadow Team',
}

// ── Inline SVG icons for bottom nav ──────────────────────────────────────────

function IconDashboard({ active }: { active: boolean }) {
  const sw = active ? 2.2 : 1.7
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  )
}

function IconPlayers({ active }: { active: boolean }) {
  const sw = active ? 2.2 : 1.7
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="7" r="4"/>
      <path d="M3 21v-2a6 6 0 0 1 12 0v2"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      <path d="M21 21v-2a4 4 0 0 0-3-3.87"/>
    </svg>
  )
}

function IconLive({ active }: { active: boolean }) {
  const sw = active ? 2.2 : 1.7
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" fill={active ? 'currentColor' : 'none'}/>
    </svg>
  )
}

function IconShortlist({ active }: { active: boolean }) {
  const sw = active ? 2.2 : 1.7
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" fill={active ? 'currentColor' : 'none'}/>
    </svg>
  )
}

function IconMenu({ active }: { active: boolean }) {
  const sw = active ? 2.2 : 1.7
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6"  x2="20" y2="6"/>
      <line x1="4" y1="12" x2="20" y2="12"/>
      <line x1="4" y1="18" x2="20" y2="18"/>
    </svg>
  )
}

// ── Bottom nav items ──────────────────────────────────────────────────────────

const BOTTOM_NAV_ITEMS = [
  { to: '/dashboard',   Icon: IconDashboard,  label: 'Dashboard' },
  { to: '/players',     Icon: IconPlayers,    label: 'Players'   },
  { to: '/shadow-team', Icon: IconLive,       label: 'Live'      },
  { to: '/shortlist',   Icon: IconShortlist,  label: 'Shortlist' },
]

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

function isActiveCheck(to: string, pathname: string) {
  return pathname.startsWith(to)
}

// ── Sidebar inner content (desktop only) ─────────────────────────────────────

function SidebarContent({
  displayName, displayEmail, initials, location, signOut, onClose, onInstall, plan, isAdmin,
}: {
  displayName: string
  displayEmail: string
  initials: string
  location: { pathname: string }
  signOut: () => void
  onClose?: () => void
  onInstall?: (() => void) | null
  plan: 'free' | 'pro' | 'enterprise'
  isAdmin: boolean
}) {
  const navigate = useNavigate()

  return (
    <>
      {/* ── ZONE 1 : Logo ──────────────────────────────────────────────── */}
      <div style={{ padding: '20px 24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <VizionLogo size="md" />
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', padding: '4px', display: 'flex',
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          display: 'block',
          marginTop: '4px',
        }}>
          Scouting Intelligence
        </span>
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginTop: '16px' }} />
      </div>

      {/* ── ZONE 2 : User card ─────────────────────────────────────────── */}
      <div style={{ padding: '0 12px 4px' }}>
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '10px',
          padding: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: avatarGradient(displayName),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 700, color: 'white', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayEmail}
            </p>
          </div>
          <button
            title="Paramètres"
            onClick={() => { onClose?.(); navigate('/settings') }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', flexShrink: 0, display: 'flex' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* ── ZONE 3 : Navigation ────────────────────────────────────────── */}
      <nav style={{ flex: 1, padding: '16px 12px 8px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--text-muted)',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          padding: '0 8px 8px',
        }}>
          Navigation
        </p>

        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
              background: isActive ? 'rgba(77,127,255,0.15)' : 'transparent',
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
            <Icon size={18} strokeWidth={isActiveCheck(to, location.pathname) ? 2.2 : 1.8} />
            {label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)',
              letterSpacing: '0.15em', textTransform: 'uppercase', padding: '12px 8px 4px',
            }}>
              Admin
            </p>
            <NavLink
              to="/admin/data"
              onClick={onClose}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 16px', borderRadius: '8px', textDecoration: 'none',
                fontSize: '14px', fontWeight: isActive ? 600 : 500,
                color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                background: isActive ? 'rgba(77,127,255,0.15)' : 'transparent',
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
              <Database size={18} strokeWidth={isActiveCheck('/admin/data', location.pathname) ? 2.2 : 1.8} />
              Données
            </NavLink>
          </>
        )}
      </nav>

      {/* ── ZONE 4 : Footer ────────────────────────────────────────────── */}
      <div style={{ padding: '12px 12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {plan === 'enterprise' ? (
          <div style={{
            background: 'rgba(0,200,150,0.06)',
            border: '1px solid rgba(0,200,150,0.18)',
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <Zap size={13} color="#00C896" fill="#00C896" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#00C896', margin: 0 }}>
              Plan Enterprise ✓
            </p>
          </div>
        ) : (
          <div style={{
            background: 'rgba(245,166,35,0.08)',
            border: '1px solid rgba(245,166,35,0.20)',
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
            onClick={() => { onClose?.(); navigate('/settings') }}
          >
            <Zap size={14} color="#F5A623" fill="#F5A623" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#F5A623', margin: 0 }}>
                ⚡ Passer à Pro
              </p>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: 0 }}>
                Débloquer toutes les fonctionnalités →
              </p>
            </div>
          </div>
        )}

        {onInstall && (
          <button
            onClick={() => { onClose?.(); onInstall() }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '9px 12px',
              background: 'rgba(0,200,150,0.08)',
              border: '1px solid rgba(0,200,150,0.22)',
              borderRadius: '8px',
              color: '#00C896',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,200,150,0.16)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,200,150,0.08)')}
          >
            <Download size={14} />
            Installer l'app
          </button>
        )}

        <button
          onClick={() => { onClose?.(); signOut() }}
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
    </>
  )
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function Layout() {
  const { user, signOut } = useAuth()
  const { organization, role } = useOrganization()
  const location = useLocation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [menuOpen, setMenuOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [tappedNav, setTappedNav] = useState<string | null>(null)
  const touchStartY = useRef(0)

  const plan = organization?.plan ?? 'free'

  // Close sheet on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (isMobile) {
      document.body.style.overflow = menuOpen ? 'hidden' : ''
    }
    return () => { document.body.style.overflow = '' }
  }, [menuOpen, isMobile])

  // Capture PWA install prompt
  useEffect(() => {
    function onBeforeInstall(e: Event) {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  async function handleInstall() {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setInstallPrompt(null)
  }

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(v => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Swipe down to dismiss bottom sheet
  function onSheetTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY
  }
  function onSheetTouchEnd(e: React.TouchEvent) {
    const delta = e.changedTouches[0].clientY - touchStartY.current
    if (delta > 80) setMenuOpen(false)
  }

  // Tap scale animation
  function handleNavTap(to: string) {
    setTappedNav(to)
    setTimeout(() => setTappedNav(null), 150)
    navigate(to)
  }

  const displayName = user?.email?.split('@')[0] ?? 'Scout'
  const displayEmail = user?.email ?? ''
  const initials = displayName.slice(0, 2).toUpperCase()

  const pageTitle = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1] ?? 'VIZION'

  const sidebarProps = {
    displayName, displayEmail, initials, location, signOut, plan,
    onInstall: installPrompt ? handleInstall : null,
    isAdmin: role === 'admin',
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: 'var(--bg-base)' }}>

      {/* ══════════════════════════════════════════════════════════════════════
          SIDEBAR — desktop only (static)
      ══════════════════════════════════════════════════════════════════════ */}
      {!isMobile && (
        <aside style={{
          width: '260px',
          minWidth: '260px',
          height: '100vh',
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}>
          <SidebarContent {...sidebarProps} />
        </aside>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN AREA
      ══════════════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Top bar ────────────────────────────────────────────────────── */}
        {isMobile ? (
          /* Mobile top bar — fixed, respects Dynamic Island / notch */
          <header style={{
            position: 'fixed',
            top: 0, left: 0, right: 0,
            zIndex: 100,
            backgroundColor: 'rgba(10,14,27,0.92)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 'calc(56px + env(safe-area-inset-top, 0px))',
            padding: 'env(safe-area-inset-top, 0px) 16px 0',
          }}>
            {/* Inner row — sits below the safe area */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', height: '56px' }}>
              <VizionLogo size="sm" />

              <span style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '0.04em',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                pointerEvents: 'none',
              }}>
                {pageTitle}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <NotificationBell />
                <button
                  onClick={() => setMenuOpen(true)}
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: avatarGradient(displayName),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 700, color: 'white',
                    border: 'none', cursor: 'pointer', flexShrink: 0,
                  }}
                  aria-label="Ouvrir le menu"
                >
                  {initials}
                </button>
              </div>
            </div>
          </header>
        ) : (
          /* Desktop top bar */
          <header style={{
            height: '60px',
            minHeight: '60px',
            backgroundColor: 'var(--bg-base)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            padding: '16px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {pageTitle}
              </h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => setCmdOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: '8px', padding: '5px 12px',
                  color: 'var(--text-muted)', fontSize: '12px',
                  cursor: 'pointer', transition: 'all 150ms ease',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.16)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'
                  e.currentTarget.style.color = 'var(--text-muted)'
                }}
              >
                Rechercher…
                <kbd style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: '5px', padding: '1px 6px',
                  fontSize: '11px', fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                }}>
                  ⌘K
                </kbd>
              </button>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                {formatDate()}
              </span>
              <NotificationBell />
            </div>
          </header>
        )}

        {/* Content */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch' as const,
          ...(isMobile ? {
            marginTop: 'calc(56px + env(safe-area-inset-top, 0px))',
            padding: '16px 16px calc(72px + env(safe-area-inset-bottom, 0px))',
          } : {
            padding: '28px',
          }),
        }}>
          <Outlet />
        </main>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          BOTTOM NAVIGATION — mobile only
      ══════════════════════════════════════════════════════════════════════ */}
      {isMobile && (
        <>
          <nav style={{
            position: 'fixed',
            bottom: 0, left: 0, right: 0,
            height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            backgroundColor: 'rgba(10,14,27,0.95)',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'stretch',
            zIndex: 80,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}>
            {BOTTOM_NAV_ITEMS.map(({ to, Icon, label }) => {
              const active = location.pathname.startsWith(to)
              const tapped = tappedNav === to
              return (
                <button
                  key={to}
                  onClick={() => handleNavTap(to)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: active ? '#00C896' : '#4A6080',
                    padding: '8px 0',
                    position: 'relative',
                    transform: tapped ? 'scale(0.88)' : 'scale(1)',
                    transition: 'transform 120ms cubic-bezier(0.34,1.56,0.64,1), color 150ms ease',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {active && (
                    <span style={{
                      position: 'absolute',
                      top: '5px',
                      width: '3px', height: '3px',
                      borderRadius: '50%',
                      background: '#00C896',
                      boxShadow: '0 0 6px #00C896',
                    }} />
                  )}
                  <Icon active={active} />
                  <span style={{
                    fontSize: '9px',
                    fontWeight: active ? 700 : 500,
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.06em',
                    lineHeight: 1,
                    opacity: active ? 1 : 0.6,
                    textTransform: 'uppercase',
                  }}>
                    {label}
                  </span>
                </button>
              )
            })}

            {/* Menu button */}
            <button
              onClick={() => setMenuOpen(v => !v)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: menuOpen ? '#00C896' : '#4A6080',
                padding: '8px 0',
                transform: tappedNav === 'menu' ? 'scale(0.88)' : 'scale(1)',
                transition: 'transform 120ms cubic-bezier(0.34,1.56,0.64,1), color 150ms ease',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <IconMenu active={menuOpen} />
              <span style={{
                fontSize: '9px',
                fontWeight: menuOpen ? 700 : 500,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.06em',
                lineHeight: 1,
                opacity: menuOpen ? 1 : 0.6,
                textTransform: 'uppercase',
              }}>
                Menu
              </span>
            </button>
          </nav>

          {/* ── Bottom Sheet (Menu drawer) ──────────────────────────────── */}
          <>
            {/* Backdrop */}
            <div
              onClick={() => setMenuOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 89,
                background: 'rgba(0,0,0,0.65)',
                opacity: menuOpen ? 1 : 0,
                pointerEvents: menuOpen ? 'auto' : 'none',
                transition: 'opacity 300ms ease',
              }}
            />

            {/* Sheet panel */}
            <div
              onTouchStart={onSheetTouchStart}
              onTouchEnd={onSheetTouchEnd}
              style={{
                position: 'fixed',
                bottom: 0, left: 0, right: 0,
                zIndex: 90,
                backgroundColor: '#0D1525',
                borderRadius: '20px 20px 0 0',
                border: '1px solid rgba(255,255,255,0.08)',
                borderBottom: 'none',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                transform: menuOpen ? 'translateY(0)' : 'translateY(100%)',
                transition: 'transform 350ms cubic-bezier(0.32,0.72,0,1)',
                maxHeight: '85vh',
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {/* Handle bar */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
                <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }} />
              </div>

              {/* Profile section */}
              <div style={{ padding: '16px 20px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: avatarGradient(displayName),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', fontWeight: 700, color: 'white', flexShrink: 0,
                  }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                      {displayName}
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {displayEmail}
                    </p>
                  </div>
                </div>

                {/* Plan badge */}
                <div style={{ marginTop: '12px' }}>
                  {plan === 'enterprise' ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.18)',
                      borderRadius: '10px', padding: '8px 12px',
                    }}>
                      <Zap size={12} color="#00C896" fill="#00C896" />
                      <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: '#00C896' }}>Plan Enterprise ✓</p>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.20)',
                        borderRadius: '10px', padding: '8px 12px', cursor: 'pointer',
                      }}
                      onClick={() => { setMenuOpen(false); navigate('/settings') }}
                    >
                      <Zap size={12} color="#F5A623" fill="#F5A623" />
                      <div>
                        <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: '#F5A623' }}>Plan Free — Passer à Pro →</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 20px' }} />

              {/* Navigation links */}
              <nav style={{ padding: '12px 12px' }}>
                <p style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  padding: '0 8px 8px',
                  margin: 0,
                }}>
                  Navigation
                </p>
                {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
                  const active = location.pathname.startsWith(to)
                  return (
                    <button
                      key={to}
                      onClick={() => { setMenuOpen(false); navigate(to) }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        width: '100%',
                        padding: '11px 16px',
                        borderRadius: '10px',
                        background: active ? 'rgba(77,127,255,0.12)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: active ? '#4D7FFF' : 'var(--text-secondary)',
                        fontSize: '14px',
                        fontWeight: active ? 600 : 500,
                        textAlign: 'left',
                        transition: 'background 150ms ease',
                      }}
                    >
                      <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                      {label}
                    </button>
                  )
                })}
              </nav>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 20px' }} />

              {/* Footer actions */}
              <div style={{ padding: '12px 20px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {installPrompt && (
                  <button
                    onClick={() => { setMenuOpen(false); handleInstall() }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '11px 14px',
                      background: 'rgba(0,200,150,0.08)',
                      border: '1px solid rgba(0,200,150,0.22)',
                      borderRadius: '10px',
                      color: '#00C896',
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer', width: '100%',
                    }}
                  >
                    <Download size={15} />
                    Installer l'app
                  </button>
                )}
                <button
                  onClick={() => { setMenuOpen(false); signOut() }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '11px 14px',
                    background: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.18)',
                    borderRadius: '10px',
                    color: '#ef4444',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer', width: '100%',
                  }}
                >
                  <LogOut size={15} />
                  Se déconnecter
                </button>
              </div>
            </div>
          </>
        </>
      )}

      <CompareBar />

      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}
    </div>
  )
}
