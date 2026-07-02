import type { ActionItem } from './action.js'
import type { AbilityScores } from './character.js'

export interface HitPointDice {
  diceCount: number
  diceValue: number
  fixedValue: number
  diceString: string
}

/**
 * A monster stat block. `id` is the primary key for persistent storage (see apps/server's
 * monster_templates table): for a D&D Beyond monster it's DDB's own numeric id (stable and
 * globally meaningful — the same id means the same monster in every encounter, for every DM); for
 * a monster from another source (e.g. Open5e) it's that source's own key, namespaced so it can
 * never collide with a real DDB numeric id (see open5e-mapper.ts).
 *
 * `challengeRating`/`creatureType`/`size`/`alignment` are optional and only populated by sources
 * that hand them over as plain, unambiguous values — D&D Beyond references all of these via small
 * numeric lookup tables (alignmentId, sizeId, typeId, challengeRatingId) this app doesn't have a
 * verified mapping for, so a DDB-sourced template leaves them unset rather than guessing (same
 * principle as the character mapper). See packages/domain/README.md.
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
  challengeRating?: string
  creatureType?: string
  size?: string
  alignment?: string
}
