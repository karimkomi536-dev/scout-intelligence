import { useState, useEffect } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Fixture {
  id:          number
  utcDate:     string
  competition: string
  homeTeam:    string   // short name
  awayTeam:    string   // short name
  isHome:      boolean  // true if the queried team is the home side
  formattedDate: string // "Dim. 30 mars · 21h00"
}

interface UseFixturesResult {
  fixtures: Fixture[]
  loading:  boolean
  error:    string | null
  hasTeam:  boolean  // false if the team has no mapping → show nothing
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatUtcDate(iso: string): string {
  const d = new Date(iso)
  const day  = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' })
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  // Capitalise first letter: "dim. 30 mars" → "Dim. 30 mars"
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${time}`
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useFixtures(teamName: string | undefined): UseFixturesResult {
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [hasTeam,  setHasTeam]  = useState(true)

  useEffect(() => {
    if (!teamName) return

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`/api/get-fixtures?team=${encodeURIComponent(teamName)}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<{
          teamId:   number | null
          fixtures: {
            id:          number
            utcDate:     string
            competition: string
            homeTeam:    { id: number; shortName: string }
            awayTeam:    { id: number; shortName: string }
            status:      string
          }[]
        }>
      })
      .then(data => {
        if (cancelled) return

        if (data.teamId === null) {
          setHasTeam(false)
          setFixtures([])
          return
        }

        setHasTeam(true)
        setFixtures(
          data.fixtures.map(f => ({
            id:            f.id,
            utcDate:       f.utcDate,
            competition:   f.competition,
            homeTeam:      f.homeTeam.shortName,
            awayTeam:      f.awayTeam.shortName,
            isHome:        f.homeTeam.id === data.teamId,
            formattedDate: formatUtcDate(f.utcDate),
          }))
        )
      })
      .catch(err => {
        if (!cancelled) setError((err as Error).message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [teamName])

  return { fixtures, loading, error, hasTeam }
}
