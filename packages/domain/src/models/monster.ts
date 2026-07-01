import type { ActionItem } from './action.js'
import type { AbilityScores } from './character.js'

export interface HitPointDice {
  diceCount: number
  diceValue: number
  fixedValue: number
  diceString: string
}

/**
 * A monster stat block, keyed by D&D Beyond's own numeric monster id — this id is the primary
 * key for persistent storage (see apps/server's monster_templates table) since it's stable and
 * globally meaningful (the same id means the same monster in every encounter, for every DM).
 *
 * Deliberately narrower than the raw DDB payload: alignment/size/type/challenge-rating/skills/
 * saving-throws all reference small lookup tables (alignmentId, sizeId, typeId, challengeRatingId,
 * skillId) this app doesn't have a verified mapping for — same "don't guess an undocumented
 * lookup and risk showing a wrong value" principle as the character mapper. Not shown until a
 * real reference table is confirmed; see packages/domain/README.md.
 */
export interface MonsterTemplate {
  id: string
  name: string
  abilityScores: AbilityScores
  armorClass: number
  armorClassDescription: string
  hitPointDice: HitPointDice
  averageHitPoints: number
  speed: number
  passivePerception: number
  actions: ActionItem[]
  sourceUrl: string
  avatarUrl: string | null
}
