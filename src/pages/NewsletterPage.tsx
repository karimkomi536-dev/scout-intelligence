import { Newspaper, Copy } from 'lucide-react'

const sections = [
  {
    title: '🔥 Top Performers This Week',
    players: [
      { name: 'Lamine Yamal', team: 'Barcelona', score: 94, summary: 'Exceptional week with 2 goals and 1 assist. Dribbling stats off the charts at 87% success rate.' },
      { name: 'Pedri', team: 'Barcelona', score: 91, summary: 'Dominant in midfield. 94% pass accuracy, 6 key passes, and strong progressive runs.' },
      { name: 'Antonio Silva', team: 'Benfica', score: 76, summary: 'Solid defensive display. Won 78% of duels and recorded 4 interceptions.' },
    ]
  },
  {
    title: '🌟 High Potential Under-21',
    players: [
      { name: 'Warren Zaire-Emery', team: 'PSG', score: 78, summary: 'Young engine in PSG midfield. Consistent minutes, growing influence game by game.' },
      { name: 'Jorrel Hato', team: 'Ajax', score: 72, summary: 'Commanding presence at CB. Technical ability rare for his age, great potential.' },
      { name: 'Mathys Tel', team: 'Bayern Munich', score: 65, summary: 'Versatile attacker showing glimpses of elite quality. Needs more minutes.' },
    ]
  },
  {
    title: '💎 Hidden Gems',
    players: [
      { name: 'Endrick', team: 'Real Madrid', score: 58, summary: 'Still adapting to European football but raw talent is undeniable. One to watch.' },
    ]
  },
]

export default function NewsletterPage() {
  const handleCopy = () => {
    const text = sections.map(s =>
      `${s.title}\n\n` + s.players.map(p =>
        `${p.name} (${p.team}) — Score: ${p.score}\n${p.summary}`
      ).join('\n\n')
    ).join('\n\n---\n\n')
    navigator.clipboard.writeText(text)
    a