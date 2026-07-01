export interface Condition {
  id: string
  name: string
  description: string
  /** For conditions like Exhaustion that have levels 1-6. */
  level?: number
}

export interface Concentration {
  spellId: string
  spellName: string
  startedAtRound?: number
}

/**
 * Mutable in-session state layered on top of the mostly-static character sheet.
 * Never comes from D&D Beyond; lives client-side (persisted via the UI store).
 */
export interface CombatState {
  currentHp: number
  tempHp: number
  conditions: Condition[]
  concentration: Concentration | null
  initiative: number | null
}
