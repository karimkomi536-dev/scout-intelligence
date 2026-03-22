import { createContext, useContext, useState, useEffect } from 'react'

const MAX_PLAYERS = 3
const STORAGE_KEY = 'vizion_compare'

interface CompareCtx {
  ids: string[]
  isSelected: (id: string) => boolean
  toggle: (id: string) => void
  clear: () => void
  compareUrl: string
}

const CompareContext = createContext<CompareCtx>({
  ids: [],
  isSelected: () => false,
  toggle: () => {},
  clear: () => {},
  compareUrl: '/compare',
})

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
    catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  }, [ids])

  function toggle(id: string) {
    setIds(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < MAX_PLAYERS ? [...prev, id] : prev
    )
  }

  function clear() { setIds([]) }

  const isSelected = (id: string) => ids.includes(id)

  const compareUrl = ids.length > 0
    ? `/compare?${ids.map((id, i) => `p${i + 1}=${id}`).join('&')}`
    : '/compare'

  return (
    <CompareContext.Provider value={{ ids, isSelected, toggle, clear, compareUrl }}>
      {children}
    </CompareContext.Provider>
  )
}

export const useCompare = () => useContext(CompareContext)
