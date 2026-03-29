import type { ToastItem } from '../hooks/useToast'

const TYPE_STYLES: Record<ToastItem['type'], React.CSSProperties> = {
  success: {
    background: 'rgba(0,200,150,0.15)',
    border:     '1px solid rgba(0,200,150,0.30)',
    color:      '#00C896',
  },
  error: {
    background: 'rgba(255,90,90,0.15)',
    border:     '1px solid rgba(255,90,90,0.30)',
    color:      '#ff6b6b',
  },
  info: {
    background: 'rgba(77,127,255,0.15)',
    border:     '1px solid rgba(77,127,255,0.30)',
    color:      '#7da9ff',
  },
}

const ANIMATION = `
  @keyframes toastIn {
    from { opacity: 0; transform: translateY(-16px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0)     scale(1); }
  }
  @keyframes toastOut {
    from { opacity: 1; transform: translateY(0)     scale(1); }
    to   { opacity: 0; transform: translateY(-12px) scale(0.95); }
  }
`

function ToastBubble({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  return (
    <div
      onClick={onDismiss}
      style={{
        ...TYPE_STYLES[toast.type],
        borderRadius: '10px',
        padding: '11px 16px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
        animation: 'toastIn 250ms cubic-bezier(0.34,1.56,0.64,1) forwards',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      } as React.CSSProperties}
    >
      {toast.message}
    </div>
  )
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}) {
  if (toasts.length === 0) return null
  return (
    <>
      <style>{ANIMATION}</style>
      <div
        style={{
          position: 'fixed',
          top: 'calc(70px + env(safe-area-inset-top, 0px))',
          left: '16px',
          right: '16px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastBubble toast={t} onDismiss={() => onDismiss(t.id)} />
          </div>
        ))}
      </div>
    </>
  )
}
