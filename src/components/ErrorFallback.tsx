export default function ErrorFallback() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0f1e',
        color: 'white',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>
        Une erreur est survenue
      </h1>
      <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 32px', maxWidth: 360 }}>
        L'équipe a été notifiée automatiquement. Rechargez la page pour continuer.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '12px 28px',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: 10,
          fontSize: 15,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Recharger la page
      </button>
    </div>
  )
}
