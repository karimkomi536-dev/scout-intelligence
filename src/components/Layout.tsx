import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Bookmark, Newspaper, Upload, LogOut, Scale } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import CompareBar from './CompareBar'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/players', icon: Users, label: 'Players' },
  { to: '/compare', icon: Scale, label: 'Compare' },
  { to: '/shortlist', icon: Bookmark, label: 'Shortlist' },
  { to: '/newsletter', icon: Newspaper, label: 'Newsletter' },
  { to: '/upload', icon: Upload, label: 'Upload' },
]

export default function Layout() {
  const { user, signOut } = useAuth()

  // Affiche l'email ou la partie locale si l'email est long
  const displayName = user?.email?.split('@')[0] ?? 'Scout'
  const displayEmail = user?.email ?? ''

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      height: '100vh',
      width: '100vw',
      backgroundColor: '#0a0f1e',
      color: 'white',
      overflow: 'hidden'
    }}>
      <aside style={{
        width: '240px',
        minWidth: '240px',
        backgroundColor: '#111827',
        padding: '32px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        height: '100vh'
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>
            ⚽ VIZION
          </h1>
          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
            Football Scouting Intelligence
          </p>
        </div>

        {/* Nav */}
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: isActive ? '#3b82f6' : 'transparent',
              color: isActive ? 'white' : '#9ca3af',
              transition: 'all 0.2s'
            })}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* User block */}
        <div style={{
          borderTop: '1px solid #1f2937',
          paddingTop: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#1d4ed8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: '700',
              color: 'white',
              flexShrink: 0,
            }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: '600', color: 'white', margin: 0, textTransform: 'capitalize' }}>
                {displayName}
              </p>
              <p style={{
                fontSize: '11px',
                color: '#6b7280',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {displayEmail}
              </p>
            </div>
          </div>

          <button
            onClick={signOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 12px',
              backgroundColor: 'transparent',
              border: '1px solid #1f2937',
              borderRadius: '8px',
              color: '#9ca3af',
              fontSize: '13px',
              cursor: 'pointer',
              width: '100%',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1f2937'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'white'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#9ca3af'
            }}
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      <main style={{
        flex: 1,
        overflowY: 'auto',
        padding: '32px',
        backgroundColor: '#0a0f1e'
      }}>
        <Outlet />
      </main>
      <CompareBar />
    </div>
  )
}
