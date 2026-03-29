import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Bookmark, Newspaper, Upload, LogOut,
  Scale, Settings, Zap, Menu, X, Target, Download,
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

const BOTTOM_NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/players',   icon: Users,           label: 'Joueurs'   },
  { to: '/shortlist', icon: Bookmark,        label: 'Shortlist' },
  { to: '/compare',   icon: Scale,           label: 'Compare'   },
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

// ── Sidebar inner content (shared desktop + drawer) ──────────────────────────

function SidebarContent({
  displayName, displayEmail, initials, location, signOut, onClose, onInstall, plan,
}: {
  displayName: string
  displayEmail: string
  initials: string
  location: { pathname: string }
  signOut: () => void
  onClose?: () => void
  onInstall?: (() => void) | null
  plan: 'free' | 'pro' | 'enterprise'
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
      </nav>

      {/* ── ZONE 4 : Footer ────────────────────────────────────────────── */}
      <div style={{ padding: '12px 12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {plan === 'enterprise' ? (
          /* Enterprise plan indicator */
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
          /* Free / Pro upgrade CTA */
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

        {/* Install PWA button — shown only when browser fires beforeinstallprompt */}
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
  const { organization } = useOrganization()
  const location = useLocation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [showProfileSheet, setShowProfileSheet] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  const plan = organization?.plan ?? 'free'

  // Close drawer on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

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

  const displayName = user?.email?.split('@')[0] ?? 'Scout'
  const displayEmail = user?.email ?? ''
  const initials = displayName.slice(0, 2).toUpperCase()

  const pageTitle = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1] ?? 'VIZION'

  const sidebarProps = {
    displayName, displayEmail, initials, location, signOut, plan,
    onInstall: installPrompt ? handleInstall : null,
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
          SIDEBAR DRAWER — mobile only (slide-in overlay)
      ══════════════════════════════════════════════════════════════════════ */}
      {isMobile && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 49,
              background: 'rgba(0,0,0,0.60)',
              opacity: sidebarOpen ? 1 : 0,
              pointerEvents: sidebarOpen ? 'auto' : 'none',
              transition: 'opacity 250ms cubic-bezier(0.4,0,0.2,1)',
            }}
          />
          {/* Drawer panel */}
          <aside style={{
            position: 'fixed',
            top: 0, left: 0, bottom: 0,
            width: '260px',
            zIndex: 50,
            backgroundColor: 'var(--bg-sidebar)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(-260px)',
            transition: 'transform 250ms cubic-bezier(0.4,0,0.2,1)',
            paddingTop: 'env(safe-area-inset-top)',
          }}>
            <SidebarContent {...sidebarProps} onClose={() => setSidebarOpen(false)} />
          </aside>
        </>
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
            backgroundColor: '#0A0E1B',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingLeft: '16px',
            paddingRight: '16px',
            paddingBottom: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 'calc(56px + env(safe-area-inset-top, 0px))',
          }}>
            {/* Burger button */}
            <button
              onClick={() => setSidebarOpen(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px' }}
              aria-label="Ouvrir le menu"
            >
              <Menu size={20} />
            </button>

            <VizionLogo size="md" />

            <NotificationBell />
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
            bottom: 0,
            left: 0,
            right: 0,
            height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            backgroundColor: '#0D1525',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'stretch',
            zIndex: 80,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}>
            {BOTTOM_NAV_ITEMS.map(({ to, icon: Icon, label }) => {
              const active = location.pathname.startsWith(to)
              return (
                <button
                  key={to}
                  onClick={() => navigate(to)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: active ? '#00C896' : '#5A7090',
                    padding: '8px 0',
                    position: 'relative',
                    transition: 'color 150ms ease',
                  }}
                >
                  {/* Active indicator dot */}
                  {active && (
                    <span style={{
                      position: 'absolute',
                      top: '6px',
                      width: '4px', height: '4px',
                      borderRadius: '50%',
                      background: '#00C896',
                      boxShadow: '0 0 6px #00C896',
                    }} />
                  )}
                  <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                  {active && (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      letterSpacing: '0.02em',
                      lineHeight: 1,
                    }}>
                      {label}
                    </span>
                  )}
                </button>
              )
            })}

            {/* Profile button */}
            <button
              onClick={() => setShowProfileSheet(v => !v)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: showProfileSheet ? '#00C896' : '#5A7090',
                padding: '8px 0',
                transition: 'color 150ms ease',
              }}
            >
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                background: showProfileSheet ? avatarGradient(displayName) : 'rgba(255,255,255,0.10)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '9px', fontWeight: 700, color: 'white',
                border: showProfileSheet ? '1.5px solid #00C896' : '1.5px solid transparent',
                transition: 'all 150ms',
              }}>
                {initials}
              </div>
              {showProfileSheet && (
                <span style={{ fontSize: '10px', fontWeight: 600, lineHeight: 1 }}>Profil</span>
              )}
            </button>
          </nav>

          {/* Profile sheet */}
          {showProfileSheet && (
            <>
              <div
                onClick={() => setShowProfileSheet(false)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 85 }}
              />
              <div style={{
                position: 'fixed',
                bottom: 'calc(60px + env(safe-area-inset-bottom))',
                left: '12px',
                right: '12px',
                zIndex: 86,
                background: '#0D1525',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: '16px',
                padding: '20px',
                animation: 'fadeIn 0.18s ease',
              }}>
                {/* User info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: avatarGradient(displayName),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '15px', fontWeight: 700, color: 'white',
                  }}>
                    {initials}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                      {displayName}
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                      {displayEmail}
                    </p>
                  </div>
                </div>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '16px' }} />
                {/* Plan badge */}
                {plan === 'enterprise' ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(0,200,150,0.06)', border: '1px solid rgba(0,200,150,0.18)',
                    borderRadius: '10px', padding: '10px 12px', marginBottom: '12px',
                  }}>
                    <Zap size={13} color="#00C896" fill="#00C896" />
                    <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: '#00C896' }}>Plan Enterprise ✓</p>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.20)',
                    borderRadius: '10px', padding: '10px 12px', marginBottom: '12px',
                  }}>
                    <Zap size={13} color="#F5A623" fill="#F5A623" />
                    <div>
                      <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: '#F5A623' }}>Plan Free</p>
                      <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-muted)' }}>Passer à Pro →</p>
                    </div>
                  </div>
                )}
                {/* Logout */}
                <button
                  onClick={() => { setShowProfileSheet(false); signOut() }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    width: '100%', padding: '10px 14px',
                    background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.20)',
                    borderRadius: '8px', color: '#ef4444',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <LogOut size={14} /> Se déconnecter
                </button>
              </div>
            </>
          )}
        </>
      )}

      <CompareBar />

      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}
    </div>
  )
}
