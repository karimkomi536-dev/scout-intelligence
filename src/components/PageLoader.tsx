export default function PageLoader() {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#07090F',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 32, height: 32,
        border: '2px solid rgba(0,229,160,0.2)',
        borderTopColor: '#00E5A0',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  )
}
