import type { EconomyType } from '../models/action.js'

/**
 * D&D Beyond's numeric "activationType" enum, reverse-engineered (no official docs exist).
 * 1 and 3 are verified directly against a real character-service response (a 1-action cantrip
 * and several 2024-rules bonus-action spells). 2/4 come from long-standing community
 * documentation (ddb-importer and similar tools) but are unverified against a live sample here —
 * treat them as reasonable defaults, not guaranteed. 5/6/7/8/9 are "Minute"/"Hour"/"Special"/
 * "Legendary Action"/"Lair Action" — not part of the PC turn economy, so they intentionally fall
 * back to 'uncategorized' rather than being force-fit into a bucket.
 */
const ACTIVATION_TYPE_ECONOMY: Record<number, EconomyType> = {
  1: 'action',
  2: 'freeAction',
  3: 'bonusAction',
  4: 'reaction',
}

export function economyFromActivationType(activationType: number | null | undefined): EconomyType {
  if (activationType == null) return 'uncategorized'
  return ACTIVATION_TYPE_ECONOMY[activationType] ?? 'uncategorized'
}
