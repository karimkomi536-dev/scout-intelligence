import { useEffect, useRef, useState } from 'react'
import { X, RotateCcw, Save, Bookmark, Trash2, Search } from 'lucide-react'
import type { PlayerFilters } from '../hooks/usePlayerFilters'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SavedSearch {
  id:      string
  name:    string
  qs:      string   // serialised URLSearchParams
  savedAt: string
}

const LS_KEY = 'vizion_saved_searches'

function loadSaved(): SavedSearch[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') }
  catch { return [] }
}

function saveSaved(list: SavedSearch[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(list))
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  bg:      '#0A0E1B',
  surface: 'rgba(17,26,46,0.98)',
  border:  'rgba(255,255,255,0.08)',
  blue:    '#4D7FFF',
  text:    'var(--text-primary, #E2EAF4)',
  muted:   'var(--text-muted, #5A7090)',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: 'var(--font-mono, monospace)',
      fontSize: '10px', fontWeight: 600,
      color: T.muted, letterSpacing: '0.12em',
      textTransform: 'uppercase', marginBottom: '8px',
    }}>
      {children}
    </p>
  )
}

function Chip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      background:    active ? 'rgba(77,127,255,0.18)' : 'transparent',
      color:         active ? T.blue : T.muted,
      border:        `1px solid ${active ? T.blue : T.border}`,
      borderRadius:  '20px',
      padding:       '4px 12px',
      fontSize:      '12px',
      fontWeight:    active ? 600 : 400,
      cursor:        'pointer',
      transition:    'all 150ms',
      whiteSpace:    'nowrap',
    }}>
      {children}
    </button>
  )
}

function NumInput({
  value, onChange, placeholder, min = 0, step = 1, suffix,
}: {
  value:       number
  onChange:    (v: number) => void
  placeholder?: string
  min?:        number
  step?:       number
  suffix?:     string
}) {
  const inputStyle: React.CSSProperties = {
    background:   'rgba(255,255,255,0.04)',
    border:       `1px solid ${T.border}`,
    color:        T.text,
    borderRadius: '6px',
    padding:      '6px 8px',
    width:        '72px',
    fontSize:     '13px',
    textAlign:    'center',
    outline:      'none',
    fontFamily:   'var(--font-mono, monospace)',
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <input
        type="number"
        min={min}
        step={step}
        value={value || ''}
        placeholder={placeholder ?? '0'}
        onChange={e => onChange(e.target.value === '' ? 0 : Math.max(min, Number(e.target.value)))}
        style={inputStyle}
      />
      {suffix && <span style={{ fontSize: '12px', color: T.muted }}>{suffix}</span>}
      {value > 0 && (
        <button onClick={() => onChange(0)} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: '0 2px', display: 'flex' }}>
          <X size={12} />
        </button>
      )}
    </div>
  )
}

// ── AdvancedSearch ────────────────────────────────────────────────────────────

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST']
const LABELS    = ['ELITE', 'TOP PROSPECT', 'INTERESTING', 'TO MONITOR', 'LOW PRIORITY']
const FOOT_OPTIONS = [
  { label: 'Gauche',   value: 'Left'  },
  { label: 'Droit',    value: 'Right' },
  { label: 'Les deux', value: ''      },
]

interface AdvancedSearchProps {
  open:             boolean
  onClose:          () => void
  filters:          PlayerFilters
  leagues:          string[]
  activeFilterCount: number
  onSet:            (updates: Partial<PlayerFilters>) => void
  onReset:          () => void
  onSave:           (name: string) => void
  onRestore:        (qs: string)   => void
  serialize:        () => string
}

export default function AdvancedSearch({
  open, onClose, filters, leagues, activeFilterCount,
  onSet, onReset, onSave, onRestore, serialize,
}: AdvancedSearchProps) {
  const overlayRef             = useRef<HTMLDivElement>(null)
  const [saveName, setSaveName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [saved, setSaved]       = useState<SavedSearch[]>(loadSaved)

  // Refresh saved list when drawer opens
  useEffect(() => { if (open) setSaved(loadSaved()) }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  function toggleList(list: string[], value: string) {
    return list.includes(value) ? list.filter(x => x !== value) : [...list, value]
  }

  function handleSave() {
    if (!saveName.trim()) return
    const entry: SavedSearch = {
      id:      crypto.randomUUID(),
      name:    saveName.trim(),
      qs:      serialize(),
      savedAt: new Date().toISOString(),
    }
    const next = [entry, ...saved].slice(0, 5) // keep max 5
    saveSaved(next)
    setSaved(next)
    onSave(entry.name)
    setSaveName('')
    setShowSaveInput(false)
  }

  function handleDelete(id: string) {
    const next = saved.filter(s => s.id !== id)
    saveSaved(next)
    setSaved(next)
  }

  function handleRestore(s: SavedSearch) {
    onRestore(s.qs)
    onClose()
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        onClick={e => { if (e.target === overlayRef.current) onClose() }}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
        }}
      >
        {/* Drawer panel */}
        <div style={{
          width: '100%', maxWidth: '420px', height: '100vh',
          background: T.surface,
          borderLeft: `1px solid ${T.border}`,
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px 16px',
            borderBottom: `1px solid ${T.border}`,
            position: 'sticky', top: 0, background: T.surface, zIndex: 1,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Search size={16} color={T.blue} />
              <span style={{ fontSize: '15px', fontWeight: 700, color: T.text }}>Recherche avancée</span>
              {activeFilterCount > 0 && (
                <span style={{
                  background: T.blue, color: 'white',
                  borderRadius: '10px', fontSize: '11px', fontWeight: 700,
                  padding: '1px 8px',
                }}>
                  {activeFilterCount} actif{activeFilterCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', display: 'flex', padding: '4px' }}>
              <X size={18} />
            </button>
          </div>

          {/* Filters body */}
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>

            {/* Postes */}
            <div>
              <Label>Poste</Label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {POSITIONS.map(p => (
                  <Chip key={p} active={filters.positions.includes(p)}
                    onClick={() => onSet({ positions: toggleList(filters.positions, p) })}>
                    {p}
                  </Chip>
                ))}
              </div>
            </div>

            {/* Âge */}
            <div>
              <Label>Âge</Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="range" min={16} max={filters.ageMax} value={filters.ageMin}
                  onChange={e => onSet({ ageMin: Number(e.target.value) })}
                  style={{ accentColor: T.blue, flex: 1 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: T.text, minWidth: '56px', textAlign: 'center' }}>
                  {filters.ageMin}–{filters.ageMax}
                </span>
                <input type="range" min={filters.ageMin} max={40} value={filters.ageMax}
                  onChange={e => onSet({ ageMax: Number(e.target.value) })}
                  style={{ accentColor: T.blue, flex: 1 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                <span style={{ fontSize: '10px', color: T.muted }}>16</span>
                <span style={{ fontSize: '10px', color: T.muted }}>40</span>
              </div>
            </div>

            {/* Score min */}
            <div>
              <Label>Score minimum</Label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="range" min={0} max={100} value={filters.minScore}
                  onChange={e => onSet({ minScore: Number(e.target.value) })}
                  style={{ accentColor: T.blue, flex: 1 }} />
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700,
                  color: T.blue, minWidth: '32px', textAlign: 'right',
                }}>
                  {filters.minScore}
                </span>
              </div>
            </div>

            {/* Labels */}
            <div>
              <Label>Étiquette scouting</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {LABELS.map(l => (
                  <label key={l} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input type="checkbox"
                      checked={filters.labels.includes(l)}
                      onChange={() => onSet({ labels: toggleList(filters.labels, l) })}
                      style={{ accentColor: T.blue, width: '14px', height: '14px' }}
                    />
                    <span style={{ fontSize: '13px', color: filters.labels.includes(l) ? T.text : T.muted }}>
                      {l}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Championnat */}
            {leagues.length > 0 && (
              <div>
                <Label>Championnat</Label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {leagues.map(l => (
                    <Chip key={l} active={filters.leagues.includes(l)}
                      onClick={() => onSet({ leagues: toggleList(filters.leagues, l) })}>
                      {l}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            {/* Forme */}
            <div>
              <Label>Forme</Label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {([
                  { type: 'hot',       emoji: '🔥', label: 'En feu',        color: '#ef4444' },
                  { type: 'rising',    emoji: '📈', label: 'En hausse',     color: '#00C896' },
                  { type: 'stable',    emoji: '➡️', label: 'Stable',        color: '#9B6DFF' },
                  { type: 'declining', emoji: '📉', label: 'En baisse',     color: '#F5A623' },
                  { type: 'cold',      emoji: '❄️', label: 'En difficulté', color: '#64748B' },
                ] as const).map(({ type, emoji, label, color }) => {
                  const active = filters.trends.includes(type)
                  return (
                    <button key={type}
                      onClick={() => onSet({ trends: toggleList(filters.trends, type) })}
                      style={{
                        background:   active ? `${color}20` : 'transparent',
                        color:        active ? color : T.muted,
                        border:       `1px solid ${active ? color + '60' : T.border}`,
                        borderRadius: '20px',
                        padding:      '4px 12px',
                        fontSize:     '12px',
                        fontWeight:   active ? 600 : 400,
                        cursor:       'pointer',
                        transition:   'all 150ms',
                        whiteSpace:   'nowrap',
                        display:      'flex',
                        alignItems:   'center',
                        gap:          '4px',
                      }}
                    >
                      {emoji} {label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Pied dominant */}
            <div>
              <Label>Pied dominant</Label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {FOOT_OPTIONS.map(({ label, value }) => (
                  <Chip key={label}
                    active={filters.foot === value && (value !== '' || filters.foot === '')}
                    onClick={() => onSet({ foot: filters.foot === value && value !== '' ? '' : value })}>
                    {label}
                  </Chip>
                ))}
              </div>
            </div>

            {/* xG min */}
            <div>
              <Label>xG minimum</Label>
              <NumInput
                value={filters.xgMin}
                onChange={v => onSet({ xgMin: v })}
                placeholder="0.0"
                step={0.1}
                suffix="xG"
              />
              <p style={{ fontSize: '11px', color: T.muted, marginTop: '6px' }}>
                Expected Goals sur la saison
              </p>
            </div>

            {/* Valeur marchande */}
            <div>
              <Label>Valeur marchande</Label>
              <select
                value={
                  filters.minValueM === 0  && filters.maxValueM === 1  ? '<1'  :
                  filters.minValueM === 1  && filters.maxValueM === 5  ? '1-5' :
                  filters.minValueM === 5  && filters.maxValueM === 20 ? '5-20':
                  filters.minValueM === 20 && filters.maxValueM === 0  ? '>20' : ''
                }
                onChange={e => {
                  const v = e.target.value
                  if (v === '')     onSet({ minValueM: 0,  maxValueM: 0  })
                  else if (v === '<1')   onSet({ minValueM: 0,  maxValueM: 1  })
                  else if (v === '1-5')  onSet({ minValueM: 1,  maxValueM: 5  })
                  else if (v === '5-20') onSet({ minValueM: 5,  maxValueM: 20 })
                  else if (v === '>20')  onSet({ minValueM: 20, maxValueM: 0  })
                }}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${T.border}`,
                  color: T.text,
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  outline: 'none',
                  width: '100%',
                }}
              >
                <option value="">Toutes</option>
                <option value="<1">moins de 1M €</option>
                <option value="1-5">1M – 5M €</option>
                <option value="5-20">5M – 20M €</option>
                <option value=">20">plus de 20M €</option>
              </select>
            </div>

            {/* Minutes min */}
            <div>
              <Label>Minutes jouées minimum</Label>
              <NumInput
                value={filters.minutesMin}
                onChange={v => onSet({ minutesMin: v })}
                placeholder="0"
                step={90}
                suffix="min"
              />
              <p style={{ fontSize: '11px', color: T.muted, marginTop: '6px' }}>
                Filtrer les joueurs réguliers (ex: 900 = 10 matchs)
              </p>
            </div>

            {/* ── Actions ─────────────────────────────────────────────────── */}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
              {/* Save search */}
              {showSaveInput ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Nom de la recherche…"
                    value={saveName}
                    onChange={e => setSaveName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowSaveInput(false) }}
                    style={{
                      flex: 1, background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${T.blue}`, borderRadius: '8px',
                      color: T.text, fontSize: '13px', padding: '8px 12px', outline: 'none',
                    }}
                  />
                  <button onClick={handleSave} style={{
                    background: T.blue, border: 'none', borderRadius: '8px',
                    color: 'white', fontSize: '12px', fontWeight: 600,
                    padding: '8px 14px', cursor: 'pointer',
                  }}>
                    OK
                  </button>
                  <button onClick={() => setShowSaveInput(false)} style={{
                    background: 'none', border: `1px solid ${T.border}`, borderRadius: '8px',
                    color: T.muted, fontSize: '12px', padding: '8px 10px', cursor: 'pointer',
                  }}>
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSaveInput(true)}
                  disabled={activeFilterCount === 0}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    background: 'rgba(77,127,255,0.10)', border: `1px solid rgba(77,127,255,0.30)`,
                    borderRadius: '8px', color: activeFilterCount > 0 ? T.blue : T.muted,
                    fontSize: '13px', fontWeight: 600, padding: '10px',
                    cursor: activeFilterCount > 0 ? 'pointer' : 'not-allowed', width: '100%',
                    opacity: activeFilterCount > 0 ? 1 : 0.5,
                  }}
                >
                  <Save size={14} /> Sauvegarder cette recherche
                </button>
              )}

              {/* Reset */}
              {activeFilterCount > 0 && (
                <button onClick={onReset} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  background: 'none', border: `1px solid ${T.border}`,
                  borderRadius: '8px', color: T.muted,
                  fontSize: '13px', padding: '10px', cursor: 'pointer', width: '100%',
                }}>
                  <RotateCcw size={13} /> Réinitialiser tous les filtres
                </button>
              )}
            </div>

            {/* ── Saved searches ──────────────────────────────────────────── */}

            {saved.length > 0 && (
              <div>
                <Label>Recherches sauvegardées</Label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {saved.map(s => (
                    <div key={s.id} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${T.border}`,
                      borderRadius: '8px', padding: '8px 12px',
                    }}>
                      <Bookmark size={13} color={T.blue} style={{ flexShrink: 0 }} />
                      <button
                        onClick={() => handleRestore(s)}
                        style={{
                          flex: 1, background: 'none', border: 'none',
                          color: T.text, fontSize: '13px', textAlign: 'left',
                          cursor: 'pointer', padding: 0,
                        }}
                      >
                        {s.name}
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', display: 'flex', padding: '2px' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Footer — apply button */}
          <div style={{
            padding: '16px 24px',
            borderTop: `1px solid ${T.border}`,
            background: T.surface,
            position: 'sticky', bottom: 0,
          }}>
            <button onClick={onClose} style={{
              width: '100%', padding: '12px',
              background: T.blue, border: 'none', borderRadius: '10px',
              color: 'white', fontSize: '14px', fontWeight: 700,
              cursor: 'pointer',
            }}>
              Voir les résultats
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
