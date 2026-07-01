/**
 * How an activatable thing consumes the D&D action economy in a turn.
 * `legendaryAction` is monster-only (DDB stat blocks carry a separate `legendaryActionsDescription`
 * field, distinct from the four PC economy buckets) — kept as its own variant rather than folded
 * into `action`, since legendary actions are usable on other creatures' turns, not the monster's own.
 */
export type EconomyType =
  | 'action'
  | 'bonusAction'
  | 'reaction'
  | 'freeAction'
  | 'legendaryAction'
  | 'uncategorized'

export type ActionSourceKind = 'weapon' | 'spell' | 'feature' | 'item' | 'monster'

export interface ActionItem {
  id: string
  name: string
  description: string
  economyType: EconomyType
  sourceKind: ActionSourceKind
  /** True when a player (or our classifier fallback) has overridden the auto-detected economyType. */
  isManualOverride: boolean
  /** e.g. "1d8 slashing", "Recharges on Short Rest" — short combat-relevant tags shown on the card. */
  tags: string[]
  iconKey?: string
}
