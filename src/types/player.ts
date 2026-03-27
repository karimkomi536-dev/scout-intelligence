export interface IndividualStats {
  technique: number
  physical: number
  pace: number
  mental: number
  tactical: number
  potential: number
}

export type ScoreLabel = 'ELITE' | 'TOP PROSPECT' | 'INTERESTING' | 'TO MONITOR' | 'LOW PRIORITY'

export interface Player {
  id: string
  name: string
  age: number | null
  team: string
  primary_position: string
  competition: string
  nationality: string | null
  foot: string | null
  scout_score: number
  scout_label: ScoreLabel
  minutes_played: number
  appearances: number
  goals: number
  assists: number
  xg: number
  xa: number
  shot_creating_actions: number
  tackles: number
  interceptions: number
  blocks: number
  clearances: number
  pressures: number
  pressure_success_rate: number
  pass_completion_rate: number
  progressive_passes: number
  key_passes: number
  individual_stats: IndividualStats | null
  market_value_eur: number | null
}
