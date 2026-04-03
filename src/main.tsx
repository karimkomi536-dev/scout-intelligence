import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import { browserTracingIntegration } from '@sentry/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime:    10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [browserTracingIntegration()],
  tracesSampleRate: 0.2,
  enabled: import.meta.env.PROD,
})

// Register service worker (production only — dev uses HMR)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(err => {
      console.warn('SW registration failed:', err)
    })
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
