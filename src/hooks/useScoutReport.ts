import { useState, useCallback } from 'react'
import type { Player } from '../types/player'

type Status = 'idle' | 'loading' | 'success' | 'error'

interface UseScoutReportResult {
  report:         string | null
  status:         Status
  error:          string | null
  generateReport: (player: Player) => Promise<void>
  reset:          () => void
}

export function useScoutReport(): UseScoutReportResult {
  const [report, setReport] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error,  setError]  = useState<string | null>(null)

  const generateReport = useCallback(async (player: Player) => {
    setStatus('loading')
    setError(null)

    try {
      const res = await fetch('/api/generate-scout-report', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ player, language: 'fr' }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }

      const data = await res.json() as { report: string }
      setReport(data.report)
      setStatus('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setStatus('error')
    }
  }, [])

  const reset = useCallback(() => {
    setReport(null)
    setStatus('idle')
    setError(null)
  }, [])

  return { report, status, error, generateReport, reset }
}
