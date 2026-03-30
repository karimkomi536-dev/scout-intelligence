import { useFixtures } from '../hooks/useFixtures'

interface Props {
  club: string
}

export default function FixturesList({ club }: Props) {
  const { fixtures, loading, error } = useFixtures(club)

  if (loading) return (
    <div style={{ padding: '12px 0' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          height: 44, background: 'rgba(255,255,255,0.03)',
          borderRadius: 8, marginBottom: 8,
        }} />
      ))}
    </div>
  )

  if (error || !fixtures?.length) return (
    <div style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 11, color: '#4A5568',
      padding: '12px 0',
    }}>
      Aucun match programmé trouvé
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {fixtures.map((fixture, i) => (
        <div key={i} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8,
        }}>
          {/* Badge domicile/extérieur */}
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.08em',
            padding: '2px 7px',
            borderRadius: 3,
            background: fixture.isHome
              ? 'rgba(0,200,150,0.12)'
              : 'rgba(255,159,67,0.12)',
            color: fixture.isHome ? '#00C896' : '#FF9F43',
            border: `1px solid ${fixture.isHome
              ? 'rgba(0,200,150,0.25)'
              : 'rgba(255,159,67,0.25)'}`,
            flexShrink: 0,
          }}>
            {fixture.isHome ? 'DOM' : 'EXT'}
          </span>

          {/* Match info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {fixture.homeTeam} vs {fixture.awayTeam}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-muted)',
            }}>
              {fixture.formattedDate} · {fixture.competition}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
