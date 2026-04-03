import { useSearchParams } from 'react-router-dom'

export interface PlayerFilters {
  search:      string
  positions:   string[]
  leagues:     string[]
  labels:      string[]   // ELITE | TOP PROSPECT | INTERESTING | TO MONITOR | LOW PRIORITY
  trends:      string[]   // hot | rising | stable | declining | cold
  nationality: string     // '' = no filter
  ageMin:      number
  ageMax:      number
  foot:        string     // '' | 'Left' | 'Right'
  minScore:    number
  maxValueM:   number     // max market value in millions, 0 = no filter
  xgMin:       number     // minimum xG per 90, 0 = no filter
  minutesMin:  number     // minimum minutes played, 0 = no filter
}

const DEFAULTS: PlayerFilters = {
  search:      '',
  positions:   [],
  leagues:     [],
  labels:      [],
  trends:      [],
  nationality: '',
  ageMin:      16,
  ageMax:      40,
  foot:        '',
  minScore:    0,
  maxValueM:   0,
  xgMin:       0,
  minutesMin:  0,
}

export function usePlayerFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters: PlayerFilters = {
    search:      searchParams.get('q')            ?? DEFAULTS.search,
    positions:   searchParams.getAll('pos'),
    leagues:     searchParams.getAll('league'),
    labels:      searchParams.getAll('label'),
    trends:      searchParams.getAll('trend'),
    nationality: searchParams.get('nationality')  ?? DEFAULTS.nationality,
    ageMin:      Number(searchParams.get('age_min')     ?? DEFAULTS.ageMin),
    ageMax:      Number(searchParams.get('age_max')     ?? DEFAULTS.ageMax),
    foot:        searchParams.get('foot')               ?? DEFAULTS.foot,
    minScore:    Number(searchParams.get('score_min')   ?? DEFAULTS.minScore),
    maxValueM:   Number(searchParams.get('max_value_m') ?? DEFAULTS.maxValueM),
    xgMin:       Number(searchParams.get('xg_min')      ?? DEFAULTS.xgMin),
    minutesMin:  Number(searchParams.get('min_min')     ?? DEFAULTS.minutesMin),
  }

  const activeFilterCount =
    (filters.positions.length > 0 ? 1 : 0) +
    (filters.leagues.length   > 0 ? 1 : 0) +
    (filters.labels.length    > 0 ? 1 : 0) +
    (filters.trends.length    > 0 ? 1 : 0) +
    (filters.nationality !== ''   ? 1 : 0) +
    (filters.foot !== ''          ? 1 : 0) +
    ((filters.ageMin > 16 || filters.ageMax < 40) ? 1 : 0) +
    (filters.minScore   > 0 ? 1 : 0) +
    (filters.maxValueM  > 0 ? 1 : 0) +
    (filters.xgMin      > 0 ? 1 : 0) +
    (filters.minutesMin > 0 ? 1 : 0)

  const hasActiveFilters = activeFilterCount > 0 || filters.search !== ''

  function set(updates: Partial<PlayerFilters>) {
    const next = { ...filters, ...updates }
    const p = new URLSearchParams()
    if (next.search)                              p.set('q',           next.search)
    next.positions.forEach(v =>                   p.append('pos',      v))
    next.leagues.forEach(v =>                     p.append('league',   v))
    next.labels.forEach(v =>                      p.append('label',    v))
    next.trends.forEach(v =>                      p.append('trend',    v))
    if (next.nationality)                         p.set('nationality', next.nationality)
    if (next.ageMin !== DEFAULTS.ageMin)          p.set('age_min',     String(next.ageMin))
    if (next.ageMax !== DEFAULTS.ageMax)          p.set('age_max',     String(next.ageMax))
    if (next.foot)                                p.set('foot',        next.foot)
    if (next.minScore   !== DEFAULTS.minScore)    p.set('score_min',   String(next.minScore))
    if (next.maxValueM  !== DEFAULTS.maxValueM)   p.set('max_value_m', String(next.maxValueM))
    if (next.xgMin      !== DEFAULTS.xgMin)       p.set('xg_min',      String(next.xgMin))
    if (next.minutesMin !== DEFAULTS.minutesMin)  p.set('min_min',     String(next.minutesMin))
    setSearchParams(p, { replace: true })
  }

  function reset() {
    setSearchParams({}, { replace: true })
  }

  /** Serialise current filters to a URL-search string for save/restore */
  function serialize(): string {
    return searchParams.toString()
  }

  /** Restore saved filters from a URL-search string */
  function restore(qs: string) {
    setSearchParams(new URLSearchParams(qs), { replace: true })
  }

  return { filters, set, reset, hasActiveFilters, activeFilterCount, serialize, restore }
}
