import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GripVertical, Plus, Trash2, Search, Share2, X, Copy, Check, Tag as TagIcon,
} from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext, useSortable, arrayMove,
  sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { calculateScore, getScoreLabel } from '../utils/scoring'
import {
  TAG_PALETTE, randomTagColor, generateToken,
} from '../types/shortlist'
import type { ShortlistGroup, ShortlistEntry, ShortlistShare, Tag } from '../types/shortlist'
import type { Player } from '../types/player'

// ── Constants ─────────────────────────────────────────────────────────────────

const LABEL_COLORS: Record<string, string> = {
  'ELITE': '#10F090', 'TOP PROSPECT': '#3b82f6',
  'INTERESTING': '#eab308', 'TO MONITOR': '#f97316', 'LOW PRIORITY': '#6b7280',
}

// ── PlayerSearch ──────────────────────────────────────────────────────────────

function PlayerSearch({
  onSelect, existingIds,
}: { onSelect: (p: Player) => void; existingIds: string[] }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Player[]>([])
  const [open, setOpen] = useState(false)
  const [dq, setDq] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDq(q), 300)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    if (!dq.trim()) { setResults([]); return }
    supabase.from('players').select('*').ilike('name', `%${dq}%`).limit(6)
      .then(({ data }) => setResults((data as Player[]) ?? []))
  }, [dq])

  return (
    <div style={{ position: 'relative', maxWidth: '340px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', borderRadius: '8px', padding: '9px 14px' }}>
        <Search size={14} color="#6b7280" />
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Ajouter un joueur…"
          style={{ background: 'none', border: 'none', outline: 'none', color: 'white', fontSize: '13px', flex: 1 }}
        />
      </div>
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#1f2937', borderRadius: '8px', zIndex: 100, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          {results.map(p => {
            const already = existingIds.includes(p.id)
            return (
              <div key={p.id}
                onMouseDown={() => { if (!already) { onSelect(p); setQ(''); setOpen(false) } }}
                style={{ padding: '10px 14px', cursor: already ? 'default' : 'pointer', opacity: already ? 0.4 : 1, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #374151' }}
                onMouseEnter={e => { if (!already) (e.currentTarget as HTMLDivElement).style.background = '#374151' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
              >
                <span style={{ color: 'white', fontSize: '13px' }}>{p.name} <span style={{ color: '#6b7280' }}>· {p.team}</span></span>
                <span style={{ background: '#0f172a', color: '#3b82f6', fontSize: '11px', padding: '2px 7px', borderRadius: '4px' }}>{p.primary_position}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── TagChip ───────────────────────────────────────────────────────────────────

function TagChip({ tag, onRemove }: { tag: Tag; onRemove: () => void }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: tag.color + '22', color: tag.color, border: `1px solid ${tag.color}44`, borderRadius: '99px', fontSize: '11px', fontWeight: 600, padding: '2px 8px 2px 8px' }}>
      {tag.label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', color: tag.color, cursor: 'pointer', padding: '0 0 0 2px', lineHeight: 1, display: 'flex' }}>
        <X size={10} />
      </button>
    </span>
  )
}

// ── AddTagInput ───────────────────────────────────────────────────────────────

function AddTagInput({ onAdd }: { onAdd: (label: string, color: string) => void }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [color, setColor] = useState(randomTagColor)
  const inputRef = useRef<HTMLInputElement>(null)

  function submit() {
    if (value.trim()) onAdd(value.trim(), color)
    setValue(''); setColor(randomTagColor()); setOpen(false)
  }

  if (!open) return (
    <button onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 10) }}
      style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'none', border: '1px dashed #374151', borderRadius: '99px', color: '#6b7280', fontSize: '11px', padding: '2px 8px', cursor: 'pointer' }}>
      <Plus size={10} /> Tag
    </button>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ display: 'flex', gap: '4px' }}>
        {TAG_PALETTE.map(c => (
          <button key={c} onClick={() => setColor(c)} style={{ width: 14, height: 14, borderRadius: '50%', background: c, border: c === color ? '2px solid white' : '2px solid transparent', cursor: 'pointer', padding: 0 }} />
        ))}
      </div>
      <input ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setOpen(false) }}
        onBlur={() => { if (!value.trim()) setOpen(false) }}
        placeholder="Nom du tag…"
        style={{ background: '#1f2937', border: 'none', outline: '1px solid ' + color, borderRadius: '6px', color: 'white', fontSize: '12px', padding: '3px 8px', width: '130px' }}
      />
      <button onClick={submit} style={{ background: color, border: 'none', borderRadius: '4px', color: 'white', fontSize: '11px', padding: '3px 8px', cursor: 'pointer' }}>OK</button>
    </div>
  )
}

// ── SortableRow ───────────────────────────────────────────────────────────────

function SortableRow({
  entry, onRemove, onUpdateTags,
}: {
  entry: ShortlistEntry
  onRemove: () => void
  onUpdateTags: (tags: Tag[]) => void
}) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id })
  const player = entry.players
  if (!player) return null

  const score = calculateScore(player)
  const label = getScoreLabel(score)
  const labelColor = LABEL_COLORS[label] || '#6b7280'

  function removeTag(tagId: string) {
    onUpdateTags(entry.tags.filter(t => t.id !== tagId))
  }

  function addTag(tagLabel: string, color: string) {
    onUpdateTags([...entry.tags, { id: crypto.randomUUID(), label: tagLabel, color }])
  }

  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
    >
      <div style={{ background: '#111827', borderRadius: '12px', padding: '16px 20px', marginBottom: '8px', display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        {/* Drag handle */}
        <div {...attributes} {...listeners} style={{ color: '#374151', cursor: 'grab', paddingTop: '2px', flexShrink: 0 }}>
          <GripVertical size={16} />
        </div>

        {/* Player info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate(`/players/${player.id}`)}
              style={{ background: 'none', border: 'none', color: 'white', fontWeight: 700, fontSize: '15px', cursor: 'pointer', padding: 0, textAlign: 'left' }}
            >
              {player.name}
            </button>
            <span style={{ background: '#0f172a', color: '#3b82f6', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px' }}>
              {player.primary_position}
            </span>
            <span style={{ background: `${labelColor}22`, color: labelColor, fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px' }}>
              {label}
            </span>
          </div>
          <p style={{ color: '#6b7280', fontSize: '12px', margin: '0 0 10px' }}>
            {player.team} · {player.competition}{player.age ? ` · ${player.age} ans` : ''}
          </p>
          {/* Tags */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {entry.tags.map(tag => (
              <TagChip key={tag.id} tag={tag} onRemove={() => removeTag(tag.id)} />
            ))}
            <AddTagInput onAdd={addTag} />
          </div>
        </div>

        {/* Score */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: labelColor }}>{score}</div>
          <div style={{ fontSize: '11px', color: '#6b7280' }}>score</div>
        </div>

        {/* Remove */}
        <button onClick={onRemove} style={{ background: 'none', border: 'none', color: '#374151', cursor: 'pointer', padding: '2px', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={e => (e.currentTarget.style.color = '#374151')}>
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}

// ── ShareModal ────────────────────────────────────────────────────────────────

function ShareModal({
  share, listId, onClose, onRevoke,
}: {
  share: ShortlistShare | null
  listId: string
  onClose: () => void
  onRevoke: () => void
}) {
  const [creating, setCreating] = useState(false)
  const [currentShare, setCurrentShare] = useState<ShortlistShare | null>(share)
  const [copied, setCopied] = useState(false)

  const shareUrl = currentShare
    ? `${window.location.origin}/shortlist/${currentShare.token}`
    : null

  async function createShare() {
    setCreating(true)
    const token = generateToken()
    const { data } = await supabase.from('shortlist_shares')
      .insert({ list_id: listId, token }).select().single()
    if (data) setCurrentShare(data as ShortlistShare)
    setCreating(false)
  }

  async function revokeShare() {
    if (!currentShare) return
    await supabase.from('shortlist_shares').delete().eq('id', currentShare.id)
    setCurrentShare(null)
    onRevoke()
  }

  async function copy() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1e293b', borderRadius: '16px', padding: '28px', width: '480px', maxWidth: '90vw', border: '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ color: 'white', fontWeight: 700, margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Share2 size={16} /> Partager cette liste
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}><X size={16} /></button>
        </div>

        {!currentShare ? (
          <div>
            <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '16px' }}>
              Génère un lien public en lecture seule. Toute personne avec le lien pourra voir la liste.
            </p>
            <button onClick={createShare} disabled={creating}
              style={{ background: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: 600, padding: '10px 20px', cursor: 'pointer', width: '100%' }}>
              {creating ? 'Génération…' : 'Créer un lien de partage'}
            </button>
          </div>
        ) : (
          <div>
            <p style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '10px' }}>Lien de partage (lecture seule)</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <div style={{ flex: 1, background: '#0f172a', borderRadius: '8px', padding: '10px 14px', color: '#94a3b8', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {shareUrl}
              </div>
              <button onClick={copy} style={{ background: copied ? '#10b981' : '#334155', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                {copied ? <><Check size={13} /> Copié</> : <><Copy size={13} /> Copier</>}
              </button>
            </div>
            <button onClick={revokeShare}
              style={{ background: 'none', border: '1px solid #374151', borderRadius: '8px', color: '#ef4444', fontSize: '12px', padding: '8px 14px', cursor: 'pointer', width: '100%' }}>
              Révoquer l'accès
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Shortlist() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<ShortlistGroup[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [entries, setEntries] = useState<ShortlistEntry[]>([])
  const [share, setShare] = useState<ShortlistShare | null>(null)
  const [showShare, setShowShare] = useState(false)
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [editingName, setEditingName] = useState<string | null>(null) // group id being renamed
  const [nameInput, setNameInput] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // ── Load groups on mount ────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return
    supabase.from('shortlist_groups').select('*')
      .eq('user_id', user.id).order('created_at')
      .then(({ data, error }) => {
        if (error) console.error('shortlist_groups:', error.message)
        const g = (data as ShortlistGroup[]) ?? []
        setGroups(g)
        if (g.length > 0) setActiveId(g[0].id)
        setLoadingGroups(false)
      })
  }, [user])

  // ── Load entries for active group ───────────────────────────────────────────

  useEffect(() => {
    if (!activeId) { setEntries([]); return }
    setLoadingEntries(true)
    supabase.from('shortlists')
      .select('*, players(*)')
      .eq('list_id', activeId)
      .order('position_index')
      .then(({ data, error }) => {
        if (error) console.error('shortlists:', error.message)
        setEntries((data as ShortlistEntry[]) ?? [])
        setLoadingEntries(false)
      })
    // Load share if any
    supabase.from('shortlist_shares').select('*').eq('list_id', activeId).maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('shortlist_shares:', error.message)
        setShare(data as ShortlistShare | null)
      })
  }, [activeId])

  // ── Group mutations ─────────────────────────────────────────────────────────

  async function createGroup() {
    if (!user) return
    const name = `Liste ${groups.length + 1}`
    const { data } = await supabase.from('shortlist_groups')
      .insert({ user_id: user.id, name }).select().single()
    if (data) {
      setGroups(prev => [...prev, data as ShortlistGroup])
      setActiveId((data as ShortlistGroup).id)
    }
  }

  async function renameGroup(id: string, newName: string) {
    if (!newName.trim()) return
    await supabase.from('shortlist_groups').update({ name: newName.trim() }).eq('id', id)
    setGroups(prev => prev.map(g => g.id === id ? { ...g, name: newName.trim() } : g))
    setEditingName(null)
  }

  async function deleteGroup(id: string) {
    if (!window.confirm('Supprimer cette liste et tous ses joueurs ?')) return
    await supabase.from('shortlist_groups').delete().eq('id', id)
    const newGroups = groups.filter(g => g.id !== id)
    setGroups(newGroups)
    setActiveId(newGroups[0]?.id ?? null)
  }

  // ── Entry mutations ─────────────────────────────────────────────────────────

  async function addPlayer(player: Player) {
    if (!activeId || !user) return
    const maxPos = entries.length
    const { data } = await supabase.from('shortlists')
      .insert({ user_id: user.id, player_id: player.id, list_id: activeId, tags: [], position_index: maxPos })
      .select('*, players(*)').single()
    if (data) setEntries(prev => [...prev, data as ShortlistEntry])
  }

  async function removeEntry(entryId: string) {
    await supabase.from('shortlists').delete().eq('id', entryId)
    setEntries(prev => prev.filter(e => e.id !== entryId))
  }

  async function updateTags(entryId: string, tags: Tag[]) {
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, tags } : e))
    await supabase.from('shortlists').update({ tags }).eq('id', entryId)
  }

  // ── Drag and drop ───────────────────────────────────────────────────────────

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = entries.findIndex(e => e.id === active.id)
    const newIdx = entries.findIndex(e => e.id === over.id)
    const reordered = arrayMove(entries, oldIdx, newIdx)
    setEntries(reordered) // optimistic
    // Persist position_index for all entries
    await Promise.all(
      reordered.map((e, i) =>
        supabase.from('shortlists').update({ position_index: i }).eq('id', e.id)
      )
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const activeGroup = groups.find(g => g.id === activeId)
  const playerIds = entries.map(e => e.player_id)

  if (loadingGroups) return <p style={{ color: '#6b7280' }}>Chargement…</p>

  return (
    <div style={{ color: 'white' }}>
      {/* Title */}
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Shortlist</h2>

      {/* ── Group tabs ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {groups.map(g => (
          <div key={g.id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            {editingName === g.id ? (
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') renameGroup(g.id, nameInput)
                  if (e.key === 'Escape') setEditingName(null)
                }}
                onBlur={() => renameGroup(g.id, nameInput || g.name)}
                autoFocus
                style={{ background: '#1f2937', border: '1px solid #3b82f6', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: 600, padding: '7px 12px', outline: 'none', width: '140px' }}
              />
            ) : (
              <button
                onClick={() => setActiveId(g.id)}
                onDoubleClick={() => { setEditingName(g.id); setNameInput(g.name) }}
                title="Double-clic pour renommer"
                style={{ background: g.id === activeId ? '#3b82f6' : '#111827', border: 'none', borderRadius: '8px', color: g.id === activeId ? 'white' : '#9ca3af', fontSize: '13px', fontWeight: 600, padding: '7px 14px', cursor: 'pointer' }}
              >
                {g.name}
              </button>
            )}
            {g.id === activeId && groups.length > 1 && (
              <button onClick={() => deleteGroup(g.id)}
                style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#374151', border: 'none', borderRadius: '50%', color: '#9ca3af', width: '16px', height: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                <X size={9} />
              </button>
            )}
          </div>
        ))}
        <button onClick={createGroup}
          style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: '1px dashed #374151', borderRadius: '8px', color: '#6b7280', fontSize: '13px', padding: '7px 12px', cursor: 'pointer' }}>
          <Plus size={13} /> Nouvelle liste
        </button>
      </div>

      {/* ── Empty state — no groups ────────────────────────────────────────── */}
      {groups.length === 0 && (
        <div style={{ background: '#111827', borderRadius: '16px', padding: '64px', textAlign: 'center' }}>
          <TagIcon size={32} color="#374151" style={{ marginBottom: '16px' }} />
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>Aucune liste pour l'instant.</p>
          <button onClick={createGroup}
            style={{ background: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', fontSize: '14px', fontWeight: 600, padding: '10px 24px', cursor: 'pointer' }}>
            Créer ma première liste
          </button>
        </div>
      )}

      {/* ── Active list ────────────────────────────────────────────────────── */}
      {activeGroup && (
        <>
          {/* List header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <PlayerSearch onSelect={addPlayer} existingIds={playerIds} />
              <p style={{ color: '#6b7280', fontSize: '13px' }}>
                {loadingEntries ? '…' : `${entries.length} joueur${entries.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <button onClick={() => setShowShare(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '7px', background: share ? '#0f172a' : '#111827', border: `1px solid ${share ? '#10b981' : '#334155'}`, borderRadius: '8px', color: share ? '#10b981' : '#9ca3af', fontSize: '13px', fontWeight: 600, padding: '8px 16px', cursor: 'pointer' }}>
              <Share2 size={14} />
              {share ? 'Lien actif' : 'Partager'}
            </button>
          </div>

          {/* Player list */}
          {loadingEntries ? (
            <p style={{ color: '#6b7280' }}>Chargement…</p>
          ) : entries.length === 0 ? (
            <div style={{ background: '#111827', borderRadius: '12px', padding: '48px', textAlign: 'center', color: '#6b7280' }}>
              Recherchez un joueur ci-dessus pour l'ajouter à cette liste.
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={entries.map(e => e.id)} strategy={verticalListSortingStrategy}>
                {entries.map(entry => (
                  <SortableRow
                    key={entry.id}
                    entry={entry}
                    onRemove={() => removeEntry(entry.id)}
                    onUpdateTags={tags => updateTags(entry.id, tags)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </>
      )}

      {/* ── Share modal ────────────────────────────────────────────────────── */}
      {showShare && activeId && (
        <ShareModal
          share={share}
          listId={activeId}
          onClose={() => setShowShare(false)}
          onRevoke={() => setShare(null)}
        />
      )}
    </div>
  )
}
