import type { AbilityName, AbilityScores } from '../models/character.js'
import type { RawCharacterData, RawModifier } from './ddb-schema.js'

/**
 * D&D Beyond does not send precomputed AC, HP, initiative, or ability modifiers anywhere in the
 * character-service payload — its own web app computes all of these client-side from base stats
 * plus the flattened `modifiers` lists. This module reimplements the parts of that derivation
 * this app needs. Formulas below (ability modifier, proficiency bonus, HP, unarmored AC, walking
 * speed) were each cross-checked against a real character's rendered sheet and matched exactly.
 *
 * Known gap, documented rather than silently wrong: AC only handles the unarmored case
 * (10 + Dex modifier + flat "armor-class" bonus modifiers). Equipped-armor/shield AC math
 * (base-by-armor-type, per-armor-type Dex caps, unarmored-defense variants) isn't implemented
 * yet — there was no equipped armor in the fixture this was built against to verify it. Until
 * then, a character with armor equipped will show an under-computed AC; the UI's manual-override
 * pattern (same one used for action-economy classification) is the intended escape hatch.
 */

const ABILITY_STAT_ID_ORDER: AbilityName[] = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
]

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function proficiencyBonusForLevel(totalLevel: number): number {
  return 2 + Math.floor((totalLevel - 1) / 4)
}

export function deriveAbilityScores(data: RawCharacterData): AbilityScores {
  const scores = {} as AbilityScores
  for (let i = 0; i < ABILITY_STAT_ID_ORDER.length; i++) {
    const abilityName = ABILITY_STAT_ID_ORDER[i]
    if (!abilityName) continue
    const base = data.stats[i]?.value ?? 10
    const bonus = data.bonusStats[i]?.value ?? 0
    const override = data.overrideStats[i]?.value
    // Ability Score Improvements from origin feats (e.g. a +1/+2 split) show up as flat "bonus"
    // modifiers keyed "<ability>-score", not in `bonusStats` — confirmed against a real character
    // whose feat-granted +1 Dex/+2 Con only appeared here.
    const featBonus = flatBonus(data, `${abilityName}-score`)
    scores[abilityName] = override ?? base + bonus + featBonus
  }
  return scores
}

export function totalCharacterLevel(data: RawCharacterData): number {
  return data.classes.reduce((sum, c) => sum + c.level, 0)
}

export function deriveMaxHp(data: RawCharacterData, abilityScores: AbilityScores): number {
  if (data.overrideHitPoints != null) return data.overrideHitPoints
  const conBonusPerLevel = abilityModifier(abilityScores.constitution)
  return data.baseHitPoints + (data.bonusHitPoints ?? 0) + conBonusPerLevel * totalCharacterLevel(data)
}

export function deriveCurrentHp(data: RawCharacterData, maxHp: number): number {
  return maxHp - data.removedHitPoints
}

function allModifiers(data: RawCharacterData): RawModifier[] {
  return [
    ...data.modifiers.race,
    ...data.modifiers.class,
    ...data.modifiers.background,
    ...data.modifiers.item,
    ...data.modifiers.feat,
    ...data.modifiers.condition,
  ]
}

function flatBonus(data: RawCharacterData, subType: string): number {
  return allModifiers(data)
    .filter((m) => m.type === 'bonus' && m.subType === subType)
    .reduce((sum, m) => sum + (m.value ?? 0), 0)
}

export function deriveArmorClass(data: RawCharacterData, abilityScores: AbilityScores): number {
  const base = 10 + abilityModifier(abilityScores.dexterity)
  return base + flatBonus(data, 'armor-class')
}

export function deriveSpeed(data: RawCharacterData): number {
  const override = allModifiers(data).find(
    (m) => (m.type === 'set' || m.type === 'set-base') && m.subType === 'innate-speed-walking',
  )
  return override?.value ?? data.race.weightSpeeds?.normal?.walk ?? 30
}
