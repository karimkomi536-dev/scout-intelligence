import { useSearchParams } from 'react-router-dom'

export interface PlayerFilters {
  search: string
  positions: string[]
  leagues: string[]
  ageMin: number
  ageMax: number
  foot: string      // '' | 'Left' | 'Right'
  minScore: number
  maxValueM: number // max market value in millions, 0 = no filter
}

const DEFAULTS: PlayerFilters = {
  search: '',
  positions: [],
  leagues: [],
  ageMin: 16,
  ageMax: 40,
  foot: '',
  minScore: 0,
  maxValueM: 0,
}

export function usePlayerFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters: PlayerFilters = {
    search:    searchParams.get('q')                         ?? DEFAULTS.search,
    positions: searchParams.getAll('pos'),
    leagues:   searchParams.getAll('league'),
    ageMin:    Number(searchParams.get('age_min')            ?? DEFAULTS.ageMin),
    ageMax:    Number(searchParams.get('age_max')            ?? DEFAULTS.ageMax),
    foot:      searchParams.get('foot')                      ?? DEFAULTS.foot,
    minScore:  Number(searchParams.get('score_min')          ?? DEFAULTS.minScore),
    maxValueM: Number(searchParams.get('max_value_m')        ?? DEFAULTS.maxValueM),
  }

  const hasActiveFilters =
    filters.search !== '' ||
    filters.positions.length > 0 ||
    filters.leagues.length > 0 ||
    filters.ageMin !== DEFAULTS.ageMin ||
    filters.ageMax !== DEFAULTS.ageMax ||
    filters.foot !== '' ||
    filters.minScore !== 0 ||
    filters.maxValueM !== 0

  function set(updates: Partial<PlayerFilters>) {
    const next = { ...filters, ...updates }
    const p = new URLSearchParams()
    if (next.search)                           p.set('q', next.search)
    next.positions.forEach(v =>                p.append('pos', v))
    next.leagues.forEach(v =>                  p.append('league', v))
    if (next.ageMin !== DEFAULTS.ageMin)       p.set('age_min', String(next.ageMin))
    if (next.ageMax !== DEFAULTS.ageMax)       p.set('age_max', String(next.ageMax))
    if (next.foot)                             p.set('foot', next.foot)
    if (next.minScore !== DEFAULTS.minScore)   p.set('score_min', String(next.minScore))
    if (next.maxValueM !== DEFAULTS.maxValueM) p.set('max_value_m', String(next.maxValueM))
    setSearchParams(p, { replace: true })
  }

  function reset() {
    setSearchParams({}, { replace: true })
  }

  return { filters, set, reset, hasActiveFilters }
}
