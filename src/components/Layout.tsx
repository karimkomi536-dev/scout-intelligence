import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Bookmark, Newspaper, Upload } from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/players', icon: Users, label: 'Players' },
  { to: '/shortlist', icon: Bookmark, label: 'Shortlist' },
  { to: '/newsletter', icon: Newspaper, label: 'Newsletter' },
  { to: '/upload', icon: Upload, label: 'Upload' },
]

export default function Layout() {
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
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>
            ⚽ VIZION
          </h1>
          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
            Football Scouting Intelligence
          </p>
        </div>
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
      </aside>

      <main style={{
        flex: 1,
        overflowY: 'auto',
        padding: '32px',
        backgroundColor: '#0a0f1e'
      }}>
        <Outlet />
      </main>
    </div>
  )
}