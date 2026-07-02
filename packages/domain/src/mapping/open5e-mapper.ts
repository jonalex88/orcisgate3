import { isPassiveFeature } from '../classification/feature-classifier.js'
import type { ActionItem, EconomyType } from '../models/action.js'
import type { HitPointDice, MonsterTemplate } from '../models/monster.js'
import {
  rawOpen5eCreatureListResponseSchema,
  rawOpen5eCreatureSchema,
  type RawOpen5eCreature,
} from './open5e-schema.js'

/**
 * Monsters seeded from Open5e don't share D&D Beyond's numeric id scheme, so they're namespaced
 * to guarantee they can never collide with a real DDB id (which are always plain digit strings) —
 * see monster.ts's doc comment and the name-match fallback in apps/server/encounter-import.ts.
 */
export function open5eMonsterId(key: string): string {
  return `open5e:${key}`
}

const ACTION_TYPE_ECONOMY: Record<string, EconomyType> = {
  ACTION: 'action',
  BONUS_ACTION: 'bonusAction',
  REACTION: 'reaction',
  LEGENDARY_ACTION: 'legendaryAction',
  MYTHIC_ACTION: 'legendaryAction',
}

function economyFromOpen5eActionType(actionType: string): EconomyType {
  return ACTION_TYPE_ECONOMY[actionType] ?? 'uncategorized'
}

/** e.g. 0.125 -> "1/8", 0.25 -> "1/4", 0.5 -> "1/2", 2 -> "2" — D&D's usual CR display format. */
function formatChallengeRating(cr: number): string {
  const fractions: Record<number, string> = { 0.125: '1/8', 0.25: '1/4', 0.5: '1/2' }
  return fractions[cr] ?? String(cr)
}

/**
 * Open5e gives hit dice as a plain string ("2d6", "10d8+20") rather than DDB's structured object.
 * Falls back to a dice-less pool sized to the reported average if the format is ever unexpected,
 * rather than throwing — a monster with a slightly-off hit-dice breakdown is better than one that
 * fails to import at all.
 */
function parseHitDice(hitDice: string | null | undefined, averageHitPoints: number): HitPointDice {
  const match = /^(\d+)d(\d+)(?:\s*\+\s*(\d+))?$/.exec((hitDice ?? '').trim())
  if (!match) {
    return { diceCount: 0, diceValue: 0, fixedValue: averageHitPoints, diceString: hitDice ?? '' }
  }
  const [, diceCount, diceValue, fixedValue] = match
  return {
    diceCount: Number(diceCount),
    diceValue: Number(diceValue),
    fixedValue: Number(fixedValue ?? 0),
    diceString: hitDice!.trim(),
  }
}

function mapCreature(raw: RawOpen5eCreature): MonsterTemplate {
  const id = open5eMonsterId(raw.key)

  const actions = raw.actions.map(
    (action, index): ActionItem => ({
      id: `${id}-action-${index}`,
      name: action.name,
      description: action.desc,
      economyType: economyFromOpen5eActionType(action.action_type),
      sourceKind: 'monster',
      isManualOverride: false,
      tags: [],
    }),
  )

  // Open5e (like the SRD stat-block format it's built from) files "you can do X as a bonus
  // action" abilities under Traits rather than a separate bonus-actions list — the same
  // heuristic used for character features decides what's genuinely passive (skipped, since a
  // hotbar isn't the place for an always-on trait) versus something worth surfacing as a
  // clickable action, even though we can't confidently guess *which* economy bucket it belongs
  // in from text alone (goes in as 'uncategorized' rather than a guess).
  const activeTraitActions = raw.traits
    .filter((trait) => !isPassiveFeature(trait.desc))
    .map(
      (trait, index): ActionItem => ({
        id: `${id}-trait-${index}`,
        name: trait.name,
        description: trait.desc,
        economyType: 'uncategorized',
        sourceKind: 'monster',
        isManualOverride: false,
        tags: [],
      }),
    )

  return {
    id,
    name: raw.name,
    abilityScores: { ...raw.ability_scores },
    armorClass: raw.armor_class,
    armorClassDescription: raw.armor_detail ?? '',
    hitPointDice: parseHitDice(raw.hit_dice, raw.hit_points),
    averageHitPoints: raw.hit_points,
    speed: raw.speed?.walk ?? 30,
    passivePerception: raw.passive_perception,
    actions: [...actions, ...activeTraitActions],
    // Open5e doesn't include a direct permalink in this response; best-effort construction from
    // the same key the API itself uses, not a guaranteed-correct URL.
    sourceUrl: `https://open5e.com/creatures/${raw.key}`,
    avatarUrl: null,
    ...(raw.challenge_rating != null ? { challengeRating: formatChallengeRating(raw.challenge_rating) } : {}),
    ...(raw.type?.name ? { creatureType: raw.type.name } : {}),
    ...(raw.size?.name ? { size: raw.size.name } : {}),
    ...(raw.alignment ? { alignment: raw.alignment } : {}),
  }
}

/** Maps a single Open5e creature detail response (`/v2/creatures/{key}/?depth=1`). */
export function mapOpen5eCreature(rawPayload: unknown): MonsterTemplate {
  return mapCreature(rawOpen5eCreatureSchema.parse(rawPayload))
}

/** Maps a page of Open5e's creature list response (`/v2/creatures/?depth=1`). */
export function mapOpen5eCreatureList(rawPayload: unknown): MonsterTemplate[] {
  return rawOpen5eCreatureListResponseSchema.parse(rawPayload).results.map(mapCreature)
}
