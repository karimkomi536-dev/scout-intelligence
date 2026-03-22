const fs = require('fs')

fs.writeFileSync('src/pages/NewsletterPage.tsx', `
const sections = [
  { title: '🔥 Top Performers', players: [
    { name: 'Lamine Yamal', team: 'Barcelona', score: 94, summary: '2 goals, 1 assist.' },
    { name: 'Pedri', team: 'Barcelona', score: 91, summary: '94% pass accuracy, 6 key passes.' },
    { name: 'Antonio Silva', team: 'Benfica', score: 76, summary: 'Won 78% of duels.' },
  ]},
  { title: '🌟 High Potential Under-21', players: [
    { name: 'Warren Zaire-Emery', team: 'PSG', score: 78, summary: 'Growing influence in PSG midfield.' },
    { name: 'Jorrel Hato', team: 'Ajax', score: 72, summary: 'Technical ability rare for his age.' },
  ]},
  { title: '💎 Hidden Gems', players: [
    { name: 'Endrick', team: 'Real Madrid', score: 58, summary: 'Raw talent adapting to European football.' },
  ]},
]

export default function NewsletterPage() {
  return (
    <div style={{ color: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Weekly Newsletter</h2>
          <p style={{ color: '#9ca3af', marginTop: '4px' }}>Auto-generated scouting digest</p>
        </div>
        <button style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer' }}>Generate Newsletter</button>
      </div>
      {sections.map(section => (
        <div key={section.title} style={{ background: '#111827', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>{section.title}</h3>
          {section.players.map(player => (
            <div key={player.name} style={{ background: '#1f2937', borderRadius: '8px', padding: '16px', marginBottom: '12px', display: 'flex', gap: '16px' }}>
              <div style={{ textAlign: 'center', minWidth: '60px' }}>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>{player.score}</p>
                <p style={{ fontSize: '12px', color: '#9ca3af' }}>Score</p>
              </div>
              <div>
                <p style={{ fontWeight: '600' }}>{player.name}</p>
                <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '4px' }}>{player.summary}</p>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
`)

console.log('NewsletterPage written!')