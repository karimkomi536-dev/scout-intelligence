import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Download, X, Search, ChevronDown, Loader2, Sparkles, CheckCircle } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { supabase } from '../lib/supabase'
import { getScoreLabel } from '../utils/scoring'
import { useScoringProfile } from '../hooks/useScoringProfile'
import { useIsMobile } from '../hooks/useIsMobile'
import type { Player } from '../types/player'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Slot {
  id:     string
  label:  string
  x:      number   // % from left on pitch
  y:      number   // % from top on pitch (0=attack end, 100=GK end)
  compat: string[] // compatible primary_position values
}

type FormationKey = '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1' | '5-3-2'
type Assignments  = Record<string, Player>

// ── Formation definitions ─────────────────────────────────────────────────────

const FORMATIONS: Record<FormationKey, Slot[]> = {
  '4-3-3': [
    { id:'GK',  label:'GK',  x:50, y:88, compat:['GK'] },
    { id:'RB',  label:'RB',  x:82, y:74, compat:['RB','LB'] },
    { id:'RCB', label:'CB',  x:62, y:76, compat:['CB'] },
    { id:'LCB', label:'CB',  x:38, y:76, compat:['CB'] },
    { id:'LB',  label:'LB',  x:18, y:74, compat:['LB','RB'] },
    { id:'RCM', label:'CM',  x:70, y:53, compat:['CM','CAM','CDM'] },
    { id:'CM',  label:'CM',  x:50, y:49, compat:['CM','CAM','CDM'] },
    { id:'LCM', label:'CM',  x:30, y:53, compat:['CM','CAM','CDM'] },
    { id:'RW',  label:'RW',  x:82, y:22, compat:['RW','LW','ST'] },
    { id:'ST',  label:'ST',  x:50, y:15, compat:['ST','RW','LW'] },
    { id:'LW',  label:'LW',  x:18, y:22, compat:['LW','RW','ST'] },
  ],
  '4-4-2': [
    { id:'GK',  label:'GK',  x:50, y:88, compat:['GK'] },
    { id:'RB',  label:'RB',  x:82, y:74, compat:['RB','LB'] },
    { id:'RCB', label:'CB',  x:62, y:76, compat:['CB'] },
    { id:'LCB', label:'CB',  x:38, y:76, compat:['CB'] },
    { id:'LB',  label:'LB',  x:18, y:74, compat:['LB','RB'] },
    { id:'RM',  label:'RM',  x:82, y:52, compat:['RW','RB','CM'] },
    { id:'RCM', label:'CM',  x:60, y:50, compat:['CM','CAM','CDM'] },
    { id:'LCM', label:'CM',  x:40, y:50, compat:['CM','CAM','CDM'] },
    { id:'LM',  label:'LM',  x:18, y:52, compat:['LW','LB','CM'] },
    { id:'ST1', label:'ST',  x:65, y:18, compat:['ST','RW','LW'] },
    { id:'ST2', label:'ST',  x:35, y:18, compat:['ST','LW','RW'] },
  ],
  '3-5-2': [
    { id:'GK',  label:'GK',  x:50, y:88, compat:['GK'] },
    { id:'RCB', label:'CB',  x:72, y:74, compat:['CB'] },
    { id:'CB',  label:'CB',  x:50, y:76, compat:['CB'] },
    { id:'LCB', label:'CB',  x:28, y:74, compat:['CB'] },
    { id:'RWB', label:'RWB', x:88, y:52, compat:['RB','LB','RW'] },
    { id:'RCM', label:'CM',  x:67, y:48, compat:['CM','CAM','CDM'] },
    { id:'CM',  label:'CM',  x:50, y:44, compat:['CM','CDM','CAM'] },
    { id:'LCM', label:'CM',  x:33, y:48, compat:['CM','CAM','CDM'] },
    { id:'LWB', label:'LWB', x:12, y:52, compat:['LB','RB','LW'] },
    { id:'ST1', label:'ST',  x:65, y:18, compat:['ST','RW','LW'] },
    { id:'ST2', label:'ST',  x:35, y:18, compat:['ST','LW','RW'] },
  ],
  '4-2-3-1': [
    { id:'GK',   label:'GK',  x:50, y:88, compat:['GK'] },
    { id:'RB',   label:'RB',  x:82, y:74, compat:['RB','LB'] },
    { id:'RCB',  label:'CB',  x:62, y:76, compat:['CB'] },
    { id:'LCB',  label:'CB',  x:38, y:76, compat:['CB'] },
    { id:'LB',   label:'LB',  x:18, y:74, compat:['LB','RB'] },
    { id:'CDM1', label:'CDM', x:62, y:61, compat:['CDM','CM'] },
    { id:'CDM2', label:'CDM', x:38, y:61, compat:['CDM','CM'] },
    { id:'RAM',  label:'AM',  x:75, y:38, compat:['CAM','CM','RW'] },
    { id:'CAM',  label:'AM',  x:50, y:34, compat:['CAM','CM'] },
    { id:'LAM',  label:'AM',  x:25, y:38, compat:['CAM','CM','LW'] },
    { id:'ST',   label:'ST',  x:50, y:15, compat:['ST','RW','LW'] },
  ],
  '5-3-2': [
    { id:'GK',  label:'GK',  x:50, y:88, compat:['GK'] },
    { id:'RWB', label:'RWB', x:88, y:74, compat:['RB','LB','RW'] },
    { id:'RCB', label:'CB',  x:68, y:77, compat:['CB'] },
    { id:'CB',  label:'CB',  x:50, y:78, compat:['CB'] },
    { id:'LCB', label:'CB',  x:32, y:77, compat:['CB'] },
    { id:'LWB', label:'LWB', x:12, y:74, compat:['LB','RB','LW'] },
    { id:'RCM', label:'CM',  x:70, y:50, compat:['CM','CAM','CDM'] },
    { id:'CM',  label:'CM',  x:50, y:46, compat:['CM','CDM','CAM'] },
    { id:'LCM', label:'CM',  x:30, y:50, compat:['CM','CAM','CDM'] },
    { id:'ST1', label:'ST',  x:65, y:18, compat:['ST','RW','LW'] },
    { id:'ST2', label:'ST',  x:35, y:18, compat:['ST','LW','RW'] },
  ],
}

// Which slot IDs belong to each line
const DEF_IDS = ['RB','RCB','LCB','LB','CB','RWB','LWB']
const MID_IDS = ['CM','RCM','LCM','CDM','CDM1','CDM2','CAM','RAM','LAM','RM','LM']
const ATT_IDS = ['ST','ST1','ST2','RW','LW']

// ── Helpers ───────────────────────────────────────────────────────────────────

const LABEL_COLOR: Record<string, string> = {
  'ELITE':        '#00C896',
  'TOP PROSPECT': '#4D7FFF',
  'INTERESTING':  '#F5A623',
  'TO MONITOR':   '#9B6DFF',
  'LOW PRIORITY': '#4A5A70',
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#4D7FFF,#22D4E8)',
  'linear-gradient(135deg,#00C896,#22D4E8)',
  'linear-gradient(135deg,#9B6DFF,#4D7FFF)',
  'linear-gradient(135deg,#F5A623,#ef4444)',
  'linear-gradient(135deg,#ec4899,#9B6DFF)',
]
const avatarGradient = (name: string) =>
  AVATAR_GRADIENTS[(name.charCodeAt(0) || 0) % AVATAR_GRADIENTS.length]
const initials = (name: string) =>
  name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()

function lineScore(slots: Slot[], ids: string[], assignments: Assignments): number | null {
  const scores = slots
    .filter(s => ids.includes(s.id) && assignments[s.id])
    .map(s => assignments[s.id].scout_score)
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
}

function teamScore(slots: Slot[], assignments: Assignments): number {
  const scores = slots
    .filter(s => assignments[s.id])
    .map(s => assignments[s.id].scout_score)
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
}

const LS_KEY_FORMATION   = 'vizion_shadow_formation'
const LS_KEY_ASSIGNMENTS = 'vizion_shadow_assignments'

// ── Pitch SVG overlay ─────────────────────────────────────────────────────────

function PitchMarkings() {
  return (
    <svg
      viewBox="0 0 100 145"
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      {/* Outer border */}
      <rect x="2" y="2" width="96" height="141" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
      {/* Center line */}
      <line x1="2" y1="72.5" x2="98" y2="72.5" stroke="rgba(255,255,255,0.25)" strokeWidth="0.6" />
      {/* Center circle */}
      <circle cx="50" cy="72.5" r="12" fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="0.6" />
      {/* Center dot */}
      <circle cx="50" cy="72.5" r="0.8" fill="rgba(255,255,255,0.40)" />
      {/* Top penalty area */}
      <rect x="20" y="2" width="60" height="19" fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="0.6" />
      {/* Top goal area */}
      <rect x="34" y="2" width="32" height="8" fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="0.6" />
      {/* Top penalty spot */}
      <circle cx="50" cy="14" r="0.8" fill="rgba(255,255,255,0.30)" />
      {/* Bottom penalty area */}
      <rect x="20" y="124" width="60" height="19" fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="0.6" />
      {/* Bottom goal area */}
      <rect x="34" y="135" width="32" height="8" fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="0.6" />
      {/* Bottom penalty spot */}
      <circle cx="50" cy="131" r="0.8" fill="rgba(255,255,255,0.30)" />
      {/* Corner arcs */}
      <path d="M 2 2 Q 5 2 5 5" fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="0.6" />
      <path d="M 98 2 Q 95 2 95 5" fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="0.6" />
      <path d="M 2 143 Q 5 143 5 140" fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="0.6" />
      <path d="M 98 143 Q 95 143 95 140" fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="0.6" />
    </svg>
  )
}

// ── Player picker modal ───────────────────────────────────────────────────────

interface PickerProps {
  slot:      Slot
  onSelect:  (player: Player) => void
  onClose:   () => void
}

function PlayerPickerModal({ slot, onSelect, onClose }: PickerProps) {
  const [query,   setQuery]   = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(async () => {
      let q = supabase
        .from('players')
        .select('id,name,primary_position,scout_score,scout_label,team,individual_stats')
        .in('primary_position', slot.compat)
        .order('scout_score', { ascending: false })
        .limit(20)

      if (query.trim()) q = q.ilike('name', `%${query.trim()}%`)

      const { data } = await q
      setPlayers((data ?? []) as Player[])
      setLoading(false)
    }, 200)
    return () => clearTimeout(timer)
  }, [query, slot.compat])

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position:'fixed', inset:0, zIndex:400, background:'rgba(5,8,18,0.75)', backdropFilter:'blur(4px)' }}
      />
      {/* Modal */}
      <div
        onKeyDown={handleKey}
        style={{
          position:'fixed', top:'15vh', left:'50%', transform:'translateX(-50%)',
          width:'min(480px, calc(100vw - 32px))', zIndex:401,
          background:'#0D1525',
          border:'1px solid rgba(255,255,255,0.10)',
          borderRadius:'14px',
          boxShadow:'0 24px 48px rgba(0,0,0,0.60)',
          overflow:'hidden',
          animation:'paletteIn 0.15s cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 16px 0' }}>
          <p style={{ margin:0, fontSize:'13px', fontWeight:700, color:'var(--text-primary)' }}>
            Choisir — <span style={{ color:'#4D7FFF' }}>{slot.label}</span>
          </p>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:'2px' }}>
            <X size={16} />
          </button>
        </div>
        {/* Search */}
        <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
          <Search size={14} color="var(--text-muted)" style={{ flexShrink:0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Rechercher parmi ${slot.compat.join(', ')}…`}
            style={{
              flex:1, background:'transparent', border:'none', outline:'none',
              color:'var(--text-primary)', fontSize:'13px', fontFamily:'inherit',
            }}
          />
          {loading && <Loader2 size={13} style={{ animation:'spin 0.7s linear infinite', color:'#4D7FFF', flexShrink:0 }} />}
        </div>
        {/* Results */}
        <div style={{ maxHeight:'320px', overflowY:'auto' }}>
          {players.length === 0 && !loading ? (
            <p style={{ padding:'24px', textAlign:'center', color:'var(--text-muted)', fontSize:'13px', margin:0 }}>
              Aucun joueur trouvé
            </p>
          ) : players.map(p => {
            const label = getScoreLabel(p.scout_score)
            const color = LABEL_COLOR[label] ?? '#4A5A70'
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                style={{
                  display:'flex', alignItems:'center', gap:'12px', width:'100%',
                  padding:'10px 16px', background:'transparent', border:'none',
                  cursor:'pointer', textAlign:'left', transition:'background 80ms ease',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(77,127,255,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width:'34px', height:'34px', borderRadius:'8px', flexShrink:0,
                  background:avatarGradient(p.name),
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'11px', fontWeight:700, color:'white',
                }}>
                  {initials(p.name)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:0, fontSize:'13px', fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {p.name}
                  </p>
                  <p style={{ margin:0, fontSize:'11px', color:'var(--text-muted)' }}>
                    {p.primary_position} · {p.team}
                  </p>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'3px', flexShrink:0 }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'14px', fontWeight:800, color }}>
                    {p.scout_score}
                  </span>
                  <span style={{ fontSize:'9px', fontWeight:700, color, background:`${color}18`, border:`1px solid ${color}28`, borderRadius:'4px', padding:'1px 5px', fontFamily:'var(--font-mono)' }}>
                    {label}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ── Suggestion panel ──────────────────────────────────────────────────────────

interface SuggestionPanelProps {
  slot:        Slot
  suggestions: Player[]
  loading:     boolean
  onAssign:    (player: Player) => void
  onSearch:    () => void
  onClose:     () => void
}

function SuggestionPanel({ slot, suggestions, loading, onAssign, onSearch, onClose }: SuggestionPanelProps) {
  return (
    <>
      <div
        onClick={onClose}
        style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(5,8,18,0.50)', backdropFilter:'blur(2px)' }}
      />
      <div style={{
        position:'fixed', top:0, right:0, bottom:0,
        width:'min(360px, 92vw)', zIndex:301,
        background:'#0D1525',
        borderLeft:'1px solid rgba(255,255,255,0.10)',
        boxShadow:'-16px 0 48px rgba(0,0,0,0.55)',
        display:'flex', flexDirection:'column',
        animation:'slideInRight 0.20s cubic-bezier(0.16,1,0.3,1) both',
        overflow:'hidden',
      }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 20px 0' }}>
          <div>
            <p style={{ margin:0, fontSize:'10px', color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.10em', fontFamily:'var(--font-mono)' }}>
              Suggestions
            </p>
            <p style={{ margin:'2px 0 0', fontSize:'16px', fontWeight:800, color:'var(--text-primary)' }}>
              Top <span style={{ color:'#4D7FFF' }}>{slot.label}</span>
            </p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', padding:'4px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Search button */}
        <div style={{ padding:'12px 20px 10px' }}>
          <button
            onClick={onSearch}
            style={{
              width:'100%', display:'flex', alignItems:'center', gap:'6px',
              background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.10)',
              borderRadius:'8px', color:'var(--text-secondary)', fontSize:'12px', fontWeight:600,
              padding:'8px 12px', cursor:'pointer',
            }}
          >
            <Search size={13} /> Rechercher un joueur…
          </button>
        </div>

        <div style={{ height:'1px', background:'rgba(255,255,255,0.07)', margin:'0 20px' }} />

        {/* Player list */}
        <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:'48px', color:'var(--text-muted)' }}>
              <Loader2 size={20} style={{ animation:'spin 0.7s linear infinite' }} />
            </div>
          ) : suggestions.length === 0 ? (
            <p style={{ textAlign:'center', padding:'32px 20px', color:'var(--text-muted)', fontSize:'13px', margin:0 }}>
              Aucun joueur disponible pour ce poste
            </p>
          ) : suggestions.map((p, idx) => {
            const label = getScoreLabel(p.scout_score)
            const color = LABEL_COLOR[label] ?? '#4A5A70'
            return (
              <div
                key={p.id}
                style={{
                  display:'flex', alignItems:'center', gap:'10px',
                  padding:'10px 20px',
                  borderBottom:'1px solid rgba(255,255,255,0.04)',
                }}
              >
                <span style={{ fontSize:'10px', fontWeight:700, color:'var(--text-muted)', width:'18px', flexShrink:0, fontFamily:'var(--font-mono)' }}>
                  #{idx + 1}
                </span>
                <div style={{
                  width:'32px', height:'32px', borderRadius:'8px', flexShrink:0,
                  background:avatarGradient(p.name),
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'10px', fontWeight:700, color:'white',
                }}>
                  {initials(p.name)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:0, fontSize:'13px', fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {p.name}
                  </p>
                  <p style={{ margin:0, fontSize:'11px', color:'var(--text-muted)' }}>
                    {p.primary_position} · {p.team}
                  </p>
                </div>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:'13px', fontWeight:800, color, flexShrink:0 }}>
                  {p.scout_score}
                </span>
                <button
                  onClick={() => onAssign(p)}
                  style={{
                    background:'rgba(77,127,255,0.15)', border:'1px solid rgba(77,127,255,0.30)',
                    borderRadius:'7px', color:'#4D7FFF', fontSize:'11px', fontWeight:700,
                    padding:'5px 10px', cursor:'pointer', flexShrink:0,
                    transition:'background 100ms ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(77,127,255,0.30)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(77,127,255,0.15)')}
                >
                  Assigner
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ShadowTeam() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { isProPlan, loading: planLoading } = useScoringProfile()
  const pitchRef = useRef<HTMLDivElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  const [formation,          setFormation]          = useState<FormationKey>('4-3-3')
  const [assignments,        setAssignments]        = useState<Assignments>({})
  const [pickerSlot,         setPickerSlot]         = useState<Slot | null>(null)
  const [menuSlotId,         setMenuSlotId]         = useState<string | null>(null)
  const [exporting,          setExporting]          = useState(false)
  const [suggestionSlot,     setSuggestionSlot]     = useState<Slot | null>(null)
  const [suggestions,        setSuggestions]        = useState<Player[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [autoBuilding,       setAutoBuilding]       = useState(false)
  const [toast,              setToast]              = useState<string | null>(null)

  // ── Load / save localStorage ──────────────────────────────────────────────

  useEffect(() => {
    try {
      const f = localStorage.getItem(LS_KEY_FORMATION)
      const a = localStorage.getItem(LS_KEY_ASSIGNMENTS)
      if (f && FORMATIONS[f as FormationKey]) setFormation(f as FormationKey)
      if (a) setAssignments(JSON.parse(a) as Assignments)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    localStorage.setItem(LS_KEY_FORMATION, formation)
    localStorage.setItem(LS_KEY_ASSIGNMENTS, JSON.stringify(assignments))
  }, [formation, assignments])

  // ── Close slot menu on outside click ──────────────────────────────────────

  useEffect(() => {
    if (!menuSlotId) return
    const handler = () => setMenuSlotId(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [menuSlotId])

  const slots = FORMATIONS[formation]

  const assignPlayer = useCallback((player: Player) => {
    if (!pickerSlot) return
    setAssignments(prev => ({ ...prev, [pickerSlot.id]: player }))
    setPickerSlot(null)
  }, [pickerSlot])

  const removePlayer = useCallback((slotId: string) => {
    setAssignments(prev => {
      const next = { ...prev }
      delete next[slotId]
      return next
    })
    setMenuSlotId(null)
  }, [])

  const loadSuggestions = useCallback(async (slot: Slot) => {
    setSuggestionSlot(slot)
    setSuggestionsLoading(true)
    setSuggestions([])
    const { data } = await supabase
      .from('players')
      .select('id,name,team,scout_score,scout_label,age,primary_position,individual_stats')
      .in('primary_position', slot.compat)
      .order('scout_score', { ascending: false })
      .limit(8)
    setSuggestions((data ?? []) as unknown as Player[])
    setSuggestionsLoading(false)
  }, [])

  const assignFromSuggestion = useCallback((player: Player) => {
    if (!suggestionSlot) return
    setAssignments(prev => ({ ...prev, [suggestionSlot.id]: player }))
    setSuggestionSlot(null)
    setSuggestions([])
  }, [suggestionSlot])

  const handleAutoBuild = useCallback(async () => {
    setAutoBuilding(true)
    const currentSlots = FORMATIONS[formation]
    const usedIds = new Set(Object.values(assignments).map(p => p.id))
    const newAssignments = { ...assignments }
    for (const slot of currentSlots) {
      if (newAssignments[slot.id]) continue
      const { data } = await supabase
        .from('players')
        .select('id,name,team,scout_score,scout_label,age,primary_position,individual_stats')
        .in('primary_position', slot.compat)
        .order('scout_score', { ascending: false })
        .limit(20)
      const candidates = (data ?? []) as unknown as Player[]
      const best = candidates.find(p => !usedIds.has(p.id))
      if (best) { newAssignments[slot.id] = best; usedIds.add(best.id) }
    }
    setAssignments(newAssignments)
    setAutoBuilding(false)
    setToast('Équipe construite automatiquement')
    setTimeout(() => setToast(null), 3000)
  }, [assignments, formation])

  // ── Export PDF ────────────────────────────────────────────────────────────

  async function handleExport() {
    if (!exportRef.current) return
    setExporting(true)
    try {
      const canvas = await html2canvas(exportRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#0A0E1B', logging: false,
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = pdf.internal.pageSize.getHeight()
      const imgAspect = canvas.width / canvas.height
      const pdfAspect = pdfW / pdfH
      let w = pdfW, h = pdfW / imgAspect
      if (imgAspect < pdfAspect) { h = pdfH; w = pdfH * imgAspect }
      pdf.addImage(imgData, 'PNG', (pdfW - w) / 2, (pdfH - h) / 2, w, h)
      pdf.save(`VIZION_ShadowTeam_${new Date().toISOString().slice(0,10)}.pdf`)
    } finally {
      setExporting(false)
    }
  }

  // ── Scores ────────────────────────────────────────────────────────────────

  const tScore = teamScore(slots, assignments)
  const tLabel = tScore > 0 ? getScoreLabel(tScore) : null
  const dScore = lineScore(slots, DEF_IDS, assignments)
  const mScore = lineScore(slots, MID_IDS, assignments)
  const aScore = lineScore(slots, ATT_IDS, assignments)
  const assigned = slots.filter(s => assignments[s.id]).length

  // ── Pro gate ──────────────────────────────────────────────────────────────

  if (planLoading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', color:'var(--text-muted)', gap:'10px' }}>
        <Loader2 size={18} style={{ animation:'spin 1s linear infinite' }} /> Chargement…
      </div>
    )
  }

  if (!isProPlan) {
    return (
      <div style={{ maxWidth:'520px', margin:'80px auto', padding:'0 24px', textAlign:'center' }}>
        <div style={{
          width:'56px', height:'56px', borderRadius:'14px', margin:'0 auto 20px',
          background:'rgba(155,109,255,0.12)', border:'1px solid rgba(155,109,255,0.25)',
          display:'flex', alignItems:'center', justifyContent:'center', color:'#9B6DFF',
        }}>
          <Lock size={24} />
        </div>
        <h1 style={{ fontSize:'22px', fontWeight:800, color:'var(--text-primary)', marginBottom:'12px' }}>Shadow Team</h1>
        <p style={{ fontSize:'14px', color:'var(--text-muted)', lineHeight:1.7, marginBottom:'28px' }}>
          Composez votre équipe idéale sur un terrain interactif, calculez le score collectif et exportez en PDF. Réservé aux plans Pro et Enterprise.
        </p>
        <button
          onClick={() => navigate('/settings')}
          style={{
            background:'linear-gradient(135deg,#9B6DFF,#4D7FFF)',
            border:'none', borderRadius:'12px',
            color:'white', fontWeight:700, fontSize:'14px',
            padding:'12px 28px', cursor:'pointer',
          }}
        >
          Passer à Pro →
        </button>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ color:'var(--text-primary)', animation:'fadeIn 0.25s ease' }}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h1 style={{ fontSize:'22px', fontWeight:800, margin:0 }}>Shadow Team</h1>
          <p style={{ fontSize:'12px', color:'var(--text-muted)', margin:'4px 0 0', fontFamily:'var(--font-mono)' }}>
            {assigned} / 11 joueurs · {formation}
          </p>
        </div>
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
          {/* Formation selector */}
          <div style={{ position:'relative' }}>
            <select
              value={formation}
              onChange={e => { setFormation(e.target.value as FormationKey); setAssignments({}) }}
              style={{
                appearance:'none', background:'rgba(255,255,255,0.05)',
                border:'1px solid rgba(255,255,255,0.12)', borderRadius:'10px',
                color:'var(--text-primary)', fontSize:'13px', fontWeight:600,
                padding:'8px 34px 8px 14px', cursor:'pointer', outline:'none',
                fontFamily:'inherit',
              }}
            >
              {(Object.keys(FORMATIONS) as FormationKey[]).map(f => (
                <option key={f} value={f} style={{ background:'#0D1525' }}>{f}</option>
              ))}
            </select>
            <ChevronDown size={13} style={{ position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', pointerEvents:'none' }} />
          </div>
          {/* Auto-build */}
          <button
            onClick={handleAutoBuild}
            disabled={autoBuilding}
            style={{
              display:'flex', alignItems:'center', gap:'6px',
              background:'rgba(155,109,255,0.15)', border:'1px solid rgba(155,109,255,0.30)',
              borderRadius:'10px', color:'#9B6DFF', fontSize:'13px', fontWeight:600,
              padding:'8px 16px', cursor: autoBuilding ? 'not-allowed' : 'pointer',
              opacity: autoBuilding ? 0.6 : 1, transition:'all 150ms ease',
            }}
          >
            {autoBuilding
              ? <><Loader2 size={13} style={{ animation:'spin 0.7s linear infinite' }} /> Construction…</>
              : <><Sparkles size={13} /> Construire auto</>
            }
          </button>
          {/* Export */}
          <button
            onClick={handleExport}
            disabled={exporting || assigned === 0}
            style={{
              display:'flex', alignItems:'center', gap:'6px',
              background:'rgba(77,127,255,0.15)', border:'1px solid rgba(77,127,255,0.30)',
              borderRadius:'10px', color:'#4D7FFF', fontSize:'13px', fontWeight:600,
              padding:'8px 16px', cursor: assigned > 0 ? 'pointer' : 'not-allowed',
              opacity: assigned === 0 ? 0.4 : 1, transition:'all 150ms ease',
            }}
          >
            {exporting
              ? <><Loader2 size={13} style={{ animation:'spin 0.7s linear infinite' }} /> Export…</>
              : <><Download size={13} /> Exporter PDF</>
            }
          </button>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div
        ref={exportRef}
        style={{
          display:'flex', gap:'20px',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'flex-start',
        }}
      >

        {/* ── PITCH ── */}
        <div
          ref={pitchRef}
          style={{
            flex:'0 0 auto',
            width: isMobile ? '100%' : 'min(400px, 55%)',
            position:'relative',
          }}
        >
          <div style={{
            position:'relative',
            paddingBottom:'142%',   // pitch aspect ratio ~2:3 portrait
            borderRadius:'12px',
            overflow:'hidden',
            background:'linear-gradient(180deg, #1a5c34 0%, #226b3e 48%, #1a5c34 100%)',
            boxShadow:'0 8px 32px rgba(0,0,0,0.40)',
          }}>
            <PitchMarkings />

            {/* Position slots */}
            {slots.map(slot => {
              const player = assignments[slot.id]
              const isMenu = menuSlotId === slot.id

              return (
                <div
                  key={slot.id}
                  style={{
                    position:'absolute',
                    left:`${slot.x}%`,
                    top:`${slot.y}%`,
                    transform:'translate(-50%, -50%)',
                    display:'flex', flexDirection:'column', alignItems:'center', gap:'3px',
                    zIndex: isMenu ? 10 : 2,
                  }}
                >
                  {player ? (
                    /* Assigned slot */
                    <div style={{ position:'relative' }}>
                      <button
                        onClick={e => { e.stopPropagation(); setMenuSlotId(isMenu ? null : slot.id) }}
                        title={player.name}
                        style={{
                          width:'38px', height:'38px', borderRadius:'50%',
                          background:avatarGradient(player.name),
                          border:'2.5px solid rgba(255,255,255,0.80)',
                          boxShadow:'0 0 10px rgba(0,0,0,0.50)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:'11px', fontWeight:800, color:'white',
                          cursor:'pointer', padding:0,
                          transition:'transform 150ms ease',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.12)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                      >
                        {initials(player.name)}
                      </button>
                      {/* Score badge */}
                      <div style={{
                        position:'absolute', bottom:'-4px', right:'-6px',
                        background:'#0A0E1B', border:'1px solid rgba(255,255,255,0.20)',
                        borderRadius:'6px', padding:'1px 4px',
                        fontSize:'8px', fontWeight:800, color:'#00C896',
                        fontFamily:'var(--font-mono)', lineHeight:1.2,
                      }}>
                        {player.scout_score}
                      </div>
                      {/* Context menu */}
                      {isMenu && (
                        <div
                          onClick={e => e.stopPropagation()}
                          style={{
                            position:'absolute', top:'calc(100% + 6px)', left:'50%', transform:'translateX(-50%)',
                            background:'#0D1525', border:'1px solid rgba(255,255,255,0.12)',
                            borderRadius:'10px', overflow:'hidden',
                            boxShadow:'0 8px 24px rgba(0,0,0,0.50)',
                            minWidth:'120px', zIndex:20,
                            animation:'fadeIn 0.12s ease',
                          }}
                        >
                          <button
                            onClick={() => { setMenuSlotId(null); setPickerSlot(slot) }}
                            style={{ display:'block', width:'100%', padding:'9px 14px', background:'transparent', border:'none', color:'var(--text-primary)', fontSize:'12px', fontWeight:600, cursor:'pointer', textAlign:'left', transition:'background 80ms' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(77,127,255,0.10)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            Changer
                          </button>
                          <button
                            onClick={() => removePlayer(slot.id)}
                            style={{ display:'block', width:'100%', padding:'9px 14px', background:'transparent', border:'none', color:'#ef4444', fontSize:'12px', fontWeight:600, cursor:'pointer', textAlign:'left', transition:'background 80ms' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            Retirer
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Empty slot */
                    <button
                      onClick={() => loadSuggestions(slot)}
                      style={{
                        width:'34px', height:'34px', borderRadius:'50%',
                        background:'rgba(255,255,255,0.08)',
                        border:'1.5px dashed rgba(255,255,255,0.40)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        color:'rgba(255,255,255,0.60)', fontSize:'16px', fontWeight:300,
                        cursor:'pointer', padding:0,
                        transition:'all 150ms ease',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(77,127,255,0.20)'
                        e.currentTarget.style.borderColor = '#4D7FFF'
                        e.currentTarget.style.color = '#4D7FFF'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.40)'
                        e.currentTarget.style.color = 'rgba(255,255,255,0.60)'
                      }}
                    >
                      +
                    </button>
                  )}

                  {/* Slot label */}
                  <span style={{
                    fontSize:'9px', fontWeight:700,
                    color:'rgba(255,255,255,0.75)',
                    textShadow:'0 1px 3px rgba(0,0,0,0.80)',
                    fontFamily:'var(--font-mono)',
                    letterSpacing:'0.04em',
                    whiteSpace:'nowrap',
                  }}>
                    {player ? player.name.split(' ').pop() : slot.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── SCORE PANEL ── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'14px', minWidth:0 }}>

          {/* Team score */}
          <div style={{
            background:'var(--bg-surface)',
            border:'1px solid rgba(255,255,255,0.07)',
            borderRadius:'14px', padding:'24px',
            textAlign:'center',
          }}>
            <p style={{ fontFamily:'var(--font-mono)', fontSize:'10px', letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--text-muted)', margin:'0 0 12px' }}>
              {assigned === 11 ? `Score moyen · ${assigned}/11` : 'Score équipe'}
            </p>
            {tScore > 0 ? (
              <>
                <div style={{
                  fontSize:'64px', fontWeight:900, lineHeight:1,
                  fontFamily:'var(--font-mono)',
                  color: LABEL_COLOR[tLabel!] ?? '#4D7FFF',
                  textShadow:`0 0 40px ${LABEL_COLOR[tLabel!] ?? '#4D7FFF'}60`,
                  marginBottom:'10px',
                }}>
                  {tScore}
                </div>
                <span style={{
                  fontSize:'11px', fontWeight:800,
                  color: LABEL_COLOR[tLabel!] ?? '#4D7FFF',
                  background:`${LABEL_COLOR[tLabel!] ?? '#4D7FFF'}18`,
                  border:`1px solid ${LABEL_COLOR[tLabel!] ?? '#4D7FFF'}30`,
                  borderRadius:'6px', padding:'3px 10px',
                  fontFamily:'var(--font-mono)', letterSpacing:'0.06em',
                }}>
                  {tLabel}
                </span>
                {assigned === 11 && (
                  <p style={{ margin:'10px 0 0', fontSize:'12px', color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>
                    Score moyen : {tScore}/100 · {tLabel}
                  </p>
                )}
              </>
            ) : (
              <p style={{ color:'var(--text-muted)', fontSize:'13px', margin:0 }}>
                Assignez des joueurs pour voir le score
              </p>
            )}
          </div>

          {/* Line scores */}
          <div style={{
            background:'var(--bg-surface)',
            border:'1px solid rgba(255,255,255,0.07)',
            borderRadius:'14px', padding:'20px',
            display:'flex', flexDirection:'column', gap:'12px',
          }}>
            <p style={{ fontFamily:'var(--font-mono)', fontSize:'10px', letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--text-muted)', margin:0 }}>
              Par ligne
            </p>
            {[
              { label:'Attaque',  score:aScore, color:'#ef4444' },
              { label:'Milieu',   score:mScore, color:'#4D7FFF' },
              { label:'Défense',  score:dScore, color:'#00C896' },
            ].map(({ label, score, color }) => (
              <div key={label}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                  <span style={{ fontSize:'12px', color:'var(--text-secondary)', fontWeight:500 }}>{label}</span>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'13px', fontWeight:700, color: score ? color : 'var(--text-muted)' }}>
                    {score ?? '—'}
                  </span>
                </div>
                <div style={{ height:'5px', background:'rgba(255,255,255,0.06)', borderRadius:'999px', overflow:'hidden' }}>
                  <div style={{
                    height:'5px', width:`${score ?? 0}%`, background:color,
                    borderRadius:'999px',
                    boxShadow:`0 0 6px ${color}80`,
                    transition:'width 500ms cubic-bezier(0.4,0,0.2,1)',
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* Assigned players list */}
          <div style={{
            background:'var(--bg-surface)',
            border:'1px solid rgba(255,255,255,0.07)',
            borderRadius:'14px', padding:'20px',
          }}>
            <p style={{ fontFamily:'var(--font-mono)', fontSize:'10px', letterSpacing:'0.15em', textTransform:'uppercase', color:'var(--text-muted)', margin:'0 0 14px' }}>
              Composition ({assigned}/11)
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              {slots.map(slot => {
                const player = assignments[slot.id]
                return (
                  <div
                    key={slot.id}
                    style={{
                      display:'flex', alignItems:'center', gap:'10px',
                      padding:'7px 10px', borderRadius:'8px',
                      background: player ? 'rgba(255,255,255,0.025)' : 'transparent',
                    }}
                  >
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:'10px', fontWeight:700, color:'var(--text-muted)', width:'32px', flexShrink:0 }}>
                      {slot.label}
                    </span>
                    {player ? (
                      <>
                        <div style={{
                          width:'24px', height:'24px', borderRadius:'6px', flexShrink:0,
                          background:avatarGradient(player.name),
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:'9px', fontWeight:700, color:'white',
                        }}>
                          {initials(player.name)}
                        </div>
                        <span style={{ flex:1, fontSize:'12px', fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {player.name}
                        </span>
                        <span style={{ fontFamily:'var(--font-mono)', fontSize:'12px', fontWeight:700, color: LABEL_COLOR[getScoreLabel(player.scout_score)] ?? '#4A5A70', flexShrink:0 }}>
                          {player.scout_score}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize:'12px', color:'var(--text-muted)', fontStyle:'italic' }}>—</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Reset button */}
          {assigned > 0 && (
            <button
              onClick={() => setAssignments({})}
              style={{
                background:'none', border:'1px solid rgba(239,68,68,0.20)',
                borderRadius:'10px', color:'rgba(239,68,68,0.60)',
                fontSize:'12px', fontWeight:600, padding:'10px',
                cursor:'pointer', transition:'all 150ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.50)'; e.currentTarget.style.color = '#ef4444' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.20)'; e.currentTarget.style.color = 'rgba(239,68,68,0.60)' }}
            >
              Réinitialiser la composition
            </button>
          )}
        </div>
      </div>

      {/* Suggestion panel */}
      {suggestionSlot && (
        <SuggestionPanel
          slot={suggestionSlot}
          suggestions={suggestions}
          loading={suggestionsLoading}
          onAssign={assignFromSuggestion}
          onSearch={() => { setPickerSlot(suggestionSlot); setSuggestionSlot(null); setSuggestions([]) }}
          onClose={() => { setSuggestionSlot(null); setSuggestions([]) }}
        />
      )}

      {/* Player picker modal */}
      {pickerSlot && (
        <PlayerPickerModal
          slot={pickerSlot}
          onSelect={assignPlayer}
          onClose={() => setPickerSlot(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', bottom:'32px', left:'50%', transform:'translateX(-50%)',
          zIndex:500, display:'flex', alignItems:'center', gap:'8px',
          background:'#0D1525', border:'1px solid rgba(0,200,150,0.35)',
          borderRadius:'12px', padding:'12px 20px',
          boxShadow:'0 8px 32px rgba(0,0,0,0.50)',
          animation:'fadeIn 0.20s ease',
          fontSize:'13px', fontWeight:600, color:'var(--text-primary)',
          whiteSpace:'nowrap',
        }}>
          <CheckCircle size={16} color="#00C896" />
          {toast}
        </div>
      )}
    </div>
  )
}
