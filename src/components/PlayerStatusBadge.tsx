type Status = 'fit' | 'injured' | 'suspended' | 'doubt'

interface Props {
  status: Status
  reason?: string
}

export default function PlayerStatusBadge({ status, reason }: Props) {
  const config = {
    fit:       { label: '✓ Disponible', color: '#00C896', bg: 'rgba(0,200,150,0.1)'   },
    injured:   { label: '✗ Blessé',     color: '#FF5A5A', bg: 'rgba(255,90,90,0.1)'   },
    suspended: { label: '⚠ Suspendu',   color: '#FF9F43', bg: 'rgba(255,159,67,0.1)'  },
    doubt:     { label: '? Incertain',  color: '#FFD166', bg: 'rgba(255,209,102,0.1)' },
  }

  const c = config[status] ?? config.fit

  return (
    <span
      title={reason}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 700,
        color: c.color,
        background: c.bg,
        border: `1px solid ${c.color}35`,
        borderRadius: 4,
        padding: '2px 8px',
      }}
    >
      {c.label}
      {reason && <span style={{ opacity: 0.7 }}>· {reason}</span>}
    </span>
  )
}
