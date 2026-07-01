import { z } from 'zod'

/**
 * Schema for D&D Beyond's monster-stats response — the same shape the Encounter Builder /
 * Monster Muncher-style tools fetch (see packages/domain/README.md). Like the character schema,
 * this only models the fields the mapper reads; alignment/size/type/challengeRating/skills/
 * saving-throws are all id-keyed against lookup tables this app doesn't have confirmed, so
 * they're deliberately left out rather than guessed.
 */
const rawMonsterStatSchema = z.object({
  statId: z.number(),
  value: z.number().nullable(),
})

const rawMovementSchema = z.object({
  movementId: z.number(),
  speed: z.number().nullable(),
})

const rawHitPointDiceSchema = z.object({
  diceCount: z.number(),
  diceValue: z.number(),
  fixedValue: z.number(),
  diceString: z.string(),
})

const rawMonsterSchema = z.object({
  id: z.number(),
  name: z.string(),
  armorClass: z.number(),
  armorClassDescription: z.string().nullable().optional(),
  averageHitPoints: z.number(),
  passivePerception: z.number(),
  hitPointDice: rawHitPointDiceSchema,
  movements: z.array(rawMovementSchema),
  stats: z.array(rawMonsterStatSchema).length(6),
  url: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  actionsDescription: z.string().nullable().optional(),
  bonusActionsDescription: z.string().nullable().optional(),
  reactionsDescription: z.string().nullable().optional(),
  legendaryActionsDescription: z.string().nullable().optional(),
  mythicActionsDescription: z.string().nullable().optional(),
})

export const rawMonsterListResponseSchema = z.object({
  data: z.array(rawMonsterSchema),
})

export type RawMonster = z.infer<typeof rawMonsterSchema>
