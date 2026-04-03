import { createContext, useContext, useState, useCallback, useRef } from 'react'
import type { ToastItem } from '../components/Toast'
import { ToastContainer } from '../components/Toast'
import { useIsMobile } from '../hooks/useIsMobile'

interface ToastCtx {
  showToast: (message: string, type?: ToastItem['type'], duration?: number) => string
  dismiss:   (id: string) => void
}

const ToastContext = createContext<ToastCtx>({
  showToast: () => '',
  dismiss:   () => {},
})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId  = useRef(0)
  const isMobile = useIsMobile()

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((
    message:  string,
    type:     ToastItem['type'] = 'info',
    duration = 3000,
  ): string => {
    const id = String(nextId.current++)
    setToasts(prev => {
      const next = [...prev, { id, message, type, duration }]
      return next.length > 3 ? next.slice(-3) : next
    })
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }
    return id
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ showToast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} isMobile={isMobile} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
