import type { Player } from './player'

export interface Tag {
  id: string
  label: string
  color: string   // hex
}

export interface ShortlistGroup {
  id: string
  user_id: string
  name: string
  created_at: string
}

export interface ShortlistEntry {
  id: string
  user_id: string
  player_id: string
  list_id: string
  tags: Tag[]
  position_index: number
  created_at: string
  // Joined
  players: Player | null
}

export interface ShortlistShare {
  id: string
  list_id: string
  token: string
  created_at: string
  expires_at: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export const TAG_PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
]

export function randomTagColor(): string {
  return TAG_PALETTE[Math.floor(Math.random() * TAG_PALETTE.length)]
}

export function generateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
