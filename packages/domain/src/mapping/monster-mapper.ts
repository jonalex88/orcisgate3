import type { AbilityName, AbilityScores } from '../models/character.js'
import type { MonsterTemplate } from '../models/monster.js'
import { rawMonsterListResponseSchema, type RawMonster } from './ddb-monster-schema.js'
import { parseActionBlocks } from './parse-action-blocks.js'

const ABILITY_STAT_ID_ORDER: AbilityName[] = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
]

function abilityScoresFromStats(stats: RawMonster['stats']): AbilityScores {
  const scores = {} as AbilityScores
  for (let i = 0; i < ABILITY_STAT_ID_ORDER.length; i++) {
    const abilityName = ABILITY_STAT_ID_ORDER[i]
    if (abilityName) scores[abilityName] = stats[i]?.value ?? 10
  }
  return scores
}

function mapMonster(raw: RawMonster): MonsterTemplate {
  const idPrefix = `monster-${raw.id}`
  return {
    id: String(raw.id),
    name: raw.name,
    abilityScores: abilityScoresFromStats(raw.stats),
    armorClass: raw.armorClass,
    armorClassDescription: (raw.armorClassDescription ?? '').trim(),
    hitPointDice: {
      diceCount: raw.hitPointDice.diceCount,
      diceValue: raw.hitPointDice.diceValue,
      fixedValue: raw.hitPointDice.fixedValue,
      diceString: raw.hitPointDice.diceString,
    },
    averageHitPoints: raw.averageHitPoints,
    // Only the first movement type is modeled — flying/swimming/burrow speeds aren't captured yet.
    speed: raw.movements[0]?.speed ?? 30,
    passivePerception: raw.passivePerception,
    actions: [
      ...parseActionBlocks(raw.actionsDescription, 'action', idPrefix),
      ...parseActionBlocks(raw.bonusActionsDescription, 'bonusAction', idPrefix),
      ...parseActionBlocks(raw.reactionsDescription, 'reaction', idPrefix),
      ...parseActionBlocks(raw.legendaryActionsDescription, 'legendaryAction', idPrefix),
      // Mythic actions are a rare, situational variant of legendary actions (only active in a
      // monster's "mythic" phase) — bucketed with legendaryAction rather than adding a sixth
      // EconomyType for a case this app doesn't otherwise distinguish yet.
      ...parseActionBlocks(raw.mythicActionsDescription, 'legendaryAction', idPrefix),
    ],
    sourceUrl: raw.url ?? '',
    avatarUrl: raw.avatarUrl ?? null,
  }
}

/**
 * Maps a D&D Beyond monster-stats response (one or many monsters) into MonsterTemplates.
 * Throws via zod on an unrecognized shape rather than silently producing broken templates.
 */
export function mapMonsters(rawPayload: unknown): MonsterTemplate[] {
  const { data } = rawMonsterListResponseSchema.parse(rawPayload)
  return data.map(mapMonster)
}
