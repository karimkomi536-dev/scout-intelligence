import { useState, Suspense, lazy, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ArrowRight } from 'lucide-react'
import { useGlobeData } from '../hooks/useGlobeData'
import { useIsMobile } from '../hooks/useIsMobile'
import { supabase } from '../lib/supabase'
import { useQuery } from '@tanstack/react-query'
import type { GlobePin } from '../components/Globe/Globe'

const Globe  = lazy(() => import('../components/Globe/Globe'))
const HexMap = lazy(() => import('../components/Globe/HexMap'))

// ── Types ─────────────────────────────────────────────────────────────────────

interface CountryPlayer {
  id:               string
  name:             string
  primary_position: string
  scout_score:      number | null
  scout_label:      string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const LABEL_COLORS: Record<string, string> = {
  'ELITE':        '#00C896',
  'TOP PROSPECT': '#3d8eff',
  'INTERESTING':  '#ff9f43',
  'TO MONITOR':   '#9B6DFF',
  'LOW PRIORITY': '#4A5A70',
}

const FILTER_LABELS = ['all', 'ELITE', 'TOP PROSPECT', 'U23'] as const
const FILTER_DISPLAY: Record<string, string> = {
  all:            'Tous',
  ELITE:          'ELITE',
  'TOP PROSPECT': 'TOP PROSPECT',
  U23:            'U23',
}

function countryFlag(country: string): string {
  const flags: Record<string, string> = {
    France: '🇫🇷', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Spain: '🇪🇸', Germany: '🇩🇪',
    Italy: '🇮🇹', Portugal: '🇵🇹', Netherlands: '🇳🇱', Belgium: '🇧🇪',
    Croatia: '🇭🇷', Serbia: '🇷🇸', Poland: '🇵🇱', Austria: '🇦🇹',
    Switzerland: '🇨🇭', Denmark: '🇩🇰', Sweden: '🇸🇪', Norway: '🇳🇴',
    'Czech Republic': '🇨🇿', Ukraine: '🇺🇦', Turkey: '🇹🇷', Greece: '🇬🇷',
    Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', Romania: '🇷🇴', Hungary: '🇭🇺', Slovakia: '🇸🇰',
    Slovenia: '🇸🇮', Brazil: '🇧🇷', Argentina: '🇦🇷', Colombia: '🇨🇴',
    Uruguay: '🇺🇾', Chile: '🇨🇱', Ecuador: '🇪🇨', Paraguay: '🇵🇾',
    Peru: '🇵🇪', Venezuela: '🇻🇪', Senegal: '🇸🇳', Morocco: '🇲🇦',
    Nigeria: '🇳🇬', 'Ivory Coast': '🇨🇮', Cameroon: '🇨🇲', Ghana: '🇬🇭',
    Algeria: '🇩🇿', Egypt: '🇪🇬', Mali: '🇲🇱', Guinea: '🇬🇳',
    'DR Congo': '🇨🇩', 'South Africa': '🇿🇦', Tunisia: '🇹🇳', Gabon: '🇬🇦',
    Mexico: '🇲🇽', 'United States': '🇺🇸', Canada: '🇨🇦', Jamaica: '🇯🇲',
    Japan: '🇯🇵', 'South Korea': '🇰🇷', Australia: '🇦🇺', China: '🇨🇳',
    Iran: '🇮🇷', 'Saudi Arabia': '🇸🇦', Qatar: '🇶🇦',
  }
  return flags[country] ?? '🌍'
}

// ── Country players hook ───────────────────────────────────────────────────────

function useCountryPlayers(country: string | null) {
  return useQuery({
    queryKey: ['country-players', country],
    queryFn: async () => {
      if (!country) return []
      const { data, error } = await supabase
        .from('players')
        .select('id, name, primary_position, scout_score, scout_label')
        .eq('nationality', country)
        .order('scout_score', { ascending: false })
        .limit(8)
      if (error) throw error
      return (data ?? []) as CountryPlayer[]
    },
    enabled: !!country,
    staleTime: 5 * 60 * 1000,
  })
}

// ── WorldMap ──────────────────────────────────────────────────────────────────

export default function WorldMap() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  const [viewMode,        setViewMode]        = useState<'globe' | 'hex'>('globe')
  const [labelFilter,     setLabelFilter]     = useState<string>('all')
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ pin: GlobePin; x: number; y: number } | null>(null)

  // ── Dynamic map width ────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const [mapWidth, setMapWidth] = useState(1000)

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setMapWidth(containerRef.current.clientWidth - 32)
      }
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  const { data: pins = [], isLoading } = useGlobeData(labelFilter === 'all' ? undefined : labelFilter)
  const { data: countryPlayers = [] }  = useCountryPlayers(selectedCountry)

  const countryCount = pins.length
  const globeSize    = isMobile ? 280 : 480
  const hexHeight    = Math.round(mapWidth * (isMobile ? 0.65 : 0.52))

  function handleHover(pin: GlobePin | null, x: number, y: number) {
    if (pin) setTooltip({ pin, x, y })
    else setTooltip(null)
  }

  return (
    <div style={{ color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div>
        <h1 style={{ fontSize: isMobile ? '20px' : '26px', fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          Carte mondiale
          <span style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: 400, color: 'var(--text-muted)', marginLeft: 10 }}>
            · {countryCount} pays représentés
          </span>
        </h1>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
          Répartition géographique des joueurs suivis
        </p>
      </div>

      {/* ── View toggle ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 4, alignSelf: 'flex-start' }}>
        {(['globe', 'hex'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            style={{
              padding: '6px 16px', borderRadius: 6, fontSize: 11, cursor: 'pointer', transition: 'all 0.2s',
              fontFamily: 'JetBrains Mono, monospace',
              background: viewMode === mode ? 'rgba(0,229,160,0.15)' : 'transparent',
              border:     viewMode === mode ? '1px solid rgba(0,229,160,0.4)' : '1px solid transparent',
              color:      viewMode === mode ? '#00E5A0' : '#64748B',
            }}
          >
            {mode === 'globe' ? '🌍 Globe 3D' : '⬡ Hex Map'}
          </button>
        ))}
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {FILTER_LABELS.map(f => (
          <button
            key={f}
            onClick={() => { setLabelFilter(f); setSelectedCountry(null) }}
            style={{
              background:   labelFilter === f ? 'var(--accent-blue)' : 'var(--surface2)',
              color:        labelFilter === f ? 'white' : 'var(--text-secondary)',
              border:       labelFilter === f ? 'none' : '1px solid var(--border)',
              borderRadius: '7px',
              padding:      '7px 16px',
              fontSize:     '12px',
              fontWeight:   600,
              cursor:       'pointer',
              transition:   'all 150ms',
            }}
          >
            {FILTER_DISPLAY[f]}
          </button>
        ))}
      </div>

      {/* ── Map card ──────────────────────────────────────────────────────────── */}
      <div style={{
        background:   'var(--surface2)',
        border:       '1px solid var(--border)',
        borderRadius: '16px',
        overflow:     'hidden',
      }}>
        {isLoading ? (
          <div style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>Chargement…</p>
          </div>
        ) : (
          <>
            {/* Globe mode — centered with padding */}
            {viewMode === 'globe' && (
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <Suspense fallback={
                  <div style={{ width: globeSize, height: globeSize, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>Initialisation…</p>
                  </div>
                }>
                  <div style={{ position: 'relative' }}>
                    <Globe
                      pins={pins}
                      onCountryClick={country => { setSelectedCountry(country); setTooltip(null) }}
                      onHover={handleHover}
                      selectedCountry={selectedCountry}
                      width={globeSize}
                      height={globeSize}
                    />
                    {/* Tooltip */}
                    {tooltip && (
                      <div style={{
                        position:       'absolute',
                        left:           Math.min(tooltip.x + 12, globeSize - 160),
                        top:            Math.max(tooltip.y - 48, 0),
                        background:     'rgba(13,21,37,0.95)',
                        border:         '1px solid rgba(255,255,255,0.12)',
                        borderRadius:   '8px',
                        padding:        '7px 12px',
                        pointerEvents:  'none',
                        whiteSpace:     'nowrap',
                        zIndex:          10,
                        backdropFilter: 'blur(8px)',
                        boxShadow:      '0 4px 16px rgba(0,0,0,0.5)',
                      }}>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {countryFlag(tooltip.pin.country)} {tooltip.pin.country}
                        </p>
                        <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {tooltip.pin.count} joueur{tooltip.pin.count !== 1 ? 's' : ''}
                          {tooltip.pin.labelCounts?.['ELITE']
                            ? ` · ${tooltip.pin.labelCounts['ELITE']} ELITE`
                            : tooltip.pin.labelCounts?.['TOP PROSPECT']
                              ? ` · ${tooltip.pin.labelCounts['TOP PROSPECT']} TOP PROSPECT`
                              : ''}
                        </p>
                      </div>
                    )}
                  </div>
                </Suspense>

                {/* Legend */}
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {[
                    { label: 'ELITE',        color: '#00e5a0' },
                    { label: 'TOP PROSPECT', color: '#3d8eff' },
                    { label: 'INTERESTING',  color: '#ff9f43' },
                  ].map(({ label, color }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hex mode — pleine largeur, sans padding */}
            {viewMode === 'hex' && (
              <div
                ref={containerRef}
                style={{
                  width:        '100%',
                  background:   'rgba(255,255,255,0.02)',
                  borderRadius: 12,
                  overflow:     'hidden',
                  padding:      '0',
                }}
              >
                <Suspense fallback={
                  <div style={{ width: '100%', height: hexHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>Initialisation…</p>
                  </div>
                }>
                  <HexMap
                    pins={pins}
                    onCountryClick={country => { setSelectedCountry(country) }}
                    width={mapWidth}
                    height={hexHeight}
                  />
                </Suspense>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Country panel — EN DESSOUS de la carte ────────────────────────────── */}
      {selectedCountry && (
        <div style={{
          marginTop:    4,
          background:   'rgba(13,18,32,0.95)',
          border:       '1px solid rgba(0,229,160,0.2)',
          borderRadius: 10,
          padding:      '16px 20px',
        }}>
          {/* Panel header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '22px' }}>{countryFlag(selectedCountry)}</span>
              <div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedCountry}</p>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                  {pins.find(p => p.country === selectedCountry)?.count ?? 0} joueurs
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedCountry(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <X size={16} />
            </button>
          </div>

          {/* Player list */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', gap: '2px' }}>
            {countryPlayers.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Aucun joueur trouvé.</p>
            ) : countryPlayers.map(p => {
              const color    = LABEL_COLORS[p.scout_label ?? ''] ?? LABEL_COLORS['LOW PRIORITY']
              const initials = p.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/players/${p.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                    background: 'transparent', transition: 'background 150ms',
                    flex: isMobile ? 'unset' : '1 1 280px',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${color}20`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color, flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </p>
                    <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-muted)' }}>{p.primary_position}</p>
                  </div>
                  {p.scout_score != null && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color, flexShrink: 0 }}>
                      {p.scout_score}
                    </span>
                  )}
                  <ArrowRight size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                </div>
              )
            })}
          </div>

          {/* Voir tous */}
          <button
            onClick={() => navigate(`/players?nationality=${encodeURIComponent(selectedCountry)}`)}
            style={{ marginTop: '14px', background: 'rgba(77,127,255,0.10)', border: '1px solid rgba(77,127,255,0.25)', color: '#4D7FFF', borderRadius: '8px', padding: '9px 20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'background 150ms' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(77,127,255,0.18)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(77,127,255,0.10)')}
          >
            Voir tous les joueurs →
          </button>
        </div>
      )}
    </div>
  )
}
