import { Users, Star, TrendingUp, Eye } from 'lucide-react'

const stats = [
  { label: 'Total Players', value: '120', icon: Users, color: '#3b82f6' },
  { label: 'Elite Players', value: '12', icon: Star, color: '#eab308' },
  { label: 'High Potential', value: '28', icon: TrendingUp, color: '#22c55e' },
  { label: 'To Monitor', value: '45', icon: Eye, color: '#f97316' },
]

export default function Dashboard() {
  return (
    <div style={{color:'white'}}>
      <h2 style={{fontSize:'24px', fontWeight:'bold', marginBottom:'8px'}}>Dashboard</h2>
      <p style={{color:'#9ca3af', marginBottom:'32px'}}>Welcome back — here's your scouting overview</p>
      <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px', marginBottom:'32px'}}>
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{background:'#111827', borderRadius:'12px', padding:'20px', display:'flex', alignItems:'center', gap:'16px'}}>
            <div style={{color, background:'#1f2937', padding:'12px', borderRadius:'8px'}}><Icon size={20} /></div>
            <div><p style={{fontSize:'24px', fontWeight:'bold'}}>{value}</p><p style={{fontSize:'12px', color:'#9ca3af'}}>{label}</p></div>
          </div>
        ))}
      </div>
    </div>
  )
}
