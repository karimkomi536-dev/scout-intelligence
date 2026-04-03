import { useState, Suspense, lazy } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ArrowRight } from 'lucide-react'
import { useGlobeData } from '../hooks/useGlobeData'
import { useIsMobile } from '../hooks/useIsMobile'
import { supabase } from '../lib/supabase'
import { useQuery } from '@tanstack/react-query'

const Globe = lazy(() => import('../components/Globe/Globe'))

// ── Types ─────────────────────────────────────────────────────────────────────

interface CountryPlayer {
  id:             string
  name:           string
  primary_position: string
  scout_score:    number | null
  scout_label:    string | null
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

// ── Country sidebar hook ──────────────────────────────────────────────────────

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
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()

  const [labelFilter, setLabelFilter] = useState<string>('all')
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null)

  const { data: pins = [], isLoading } = useGlobeData(labelFilter === 'all' ? undefined : labelFilter)
  const { data: countryPlayers = [] }  = useCountryPlayers(selectedCountry)

  const countryCount = pins.length
  const globeSize    = isMobile ? 280 : 480

  return (
    <div style={{ color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
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

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {FILTER_LABELS.map(f => (
          <button
            key={f}
            onClick={() => { setLabelFilter(f); setSelectedCountry(null) }}
            style={{
              background:  labelFilter === f ? 'var(--accent-blue)' : 'var(--surface2)',
              color:       labelFilter === f ? 'white' : 'var(--text-secondary)',
              border:      labelFilter === f ? 'none' : '1px solid var(--border)',
              borderRadius: '7px',
              padding:     '7px 16px',
              fontSize:    '12px',
              fontWeight:  600,
              cursor:      'pointer',
              transition:  'all 150ms',
            }}
          >
            {FILTER_DISPLAY[f]}
          </button>
        ))}
      </div>

      {/* ── Globe + Sidebar ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: selectedCountry && !isMobile ? '1fr 320px' : '1fr',
        gap: '16px',
        alignItems: 'flex-start',
      }}>

        {/* Globe card */}
        <div style={{
          background:   'var(--surface2)',
          border:       '1px solid var(--border)',
          borderRadius: '16px',
          padding:      '24px',
          display:      'flex',
          flexDirection: 'column',
          alignItems:   'center',
          gap:          '16px',
        }}>
          {isLoading ? (
            <div style={{ width: globeSize, height: globeSize, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>Chargement…</p>
            </div>
          ) : (
            <Suspense fallback={
              <div style={{ width: globeSize, height: globeSize, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>Initialisation…</p>
              </div>
            }>
              <Globe
                pins={pins}
                onCountryClick={setSelectedCountry}
                width={globeSize}
                height={globeSize}
              />
            </Suspense>
          )}

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

        {/* Country sidebar */}
        {selectedCountry && (
          <div style={{
            background:   'var(--surface2)',
            border:       '1px solid var(--border)',
            borderRadius: '16px',
            padding:      '20px',
          }}>
            {/* Sidebar header */}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {countryPlayers.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Aucun joueur trouvé.</p>
              ) : countryPlayers.map(p => {
                const color = LABEL_COLORS[p.scout_label ?? ''] ?? LABEL_COLORS['LOW PRIORITY']
                const initials = p.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
                return (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/players/${p.id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 6px', borderRadius: '8px', cursor: 'pointer', background: 'transparent', transition: 'background 150ms' }}
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
              style={{ width: '100%', marginTop: '14px', background: 'rgba(77,127,255,0.10)', border: '1px solid rgba(77,127,255,0.25)', color: '#4D7FFF', borderRadius: '8px', padding: '9px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'background 150ms' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(77,127,255,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(77,127,255,0.10)')}
            >
              Voir tous →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
