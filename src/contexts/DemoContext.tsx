import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Player } from '../types/player'
import { DEMO_PLAYERS } from '../data/demo-players'

const SHORTLIST_KEY = 'vizion-demo-shortlist'

interface DemoContextValue {
  isDemoMode: true
  players: Player[]
  shortlist: Set<string>
  toggleShortlist: (id: string) => void
  isShortlisted: (id: string) => boolean
  getDemoPlayer: (id: string) => Player | undefined
}

const DemoContext = createContext<DemoContextValue | null>(null)

function loadShortlistFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(SHORTLIST_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return new Set<string>(parsed)
  } catch {
    // Ignore parse errors
  }
  return new Set()
}

function saveShortlistToStorage(shortlist: Set<string>): void {
  try {
    localStorage.setItem(SHORTLIST_KEY, JSON.stringify(Array.from(shortlist)))
  } catch {
    // Ignore storage errors
  }
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [shortlist, setShortlist] = useState<Set<string>>(() => loadShortlistFromStorage())

  const toggleShortlist = useCallback((id: string) => {
    setShortlist(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      saveShortlistToStorage(next)
      return next
    })
  }, [])

  const isShortlisted = useCallback((id: string) => shortlist.has(id), [shortlist])

  const getDemoPlayer = useCallback(
    (id: string) => DEMO_PLAYERS.find(p => p.id === id),
    [],
  )

  const value: DemoContextValue = {
    isDemoMode: true,
    players: DEMO_PLAYERS,
    shortlist,
    toggleShortlist,
    isShortlisted,
    getDemoPlayer,
  }

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error('useDemo must be used within a DemoProvider')
  return ctx
}
