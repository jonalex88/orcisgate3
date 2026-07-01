import { z } from 'zod'

/**
 * Schema for a D&D Beyond Encounter Builder / Combat Tracker export — see
 * packages/domain/README.md. `monsters[].id` is a *reference* to a monster stat block (the same
 * id `mapMonsters` produces `MonsterTemplate.id` from), not the stat block itself — encounters
 * and monster stat blocks are two separate pastes by design (see the plan's persistence decision:
 * monster templates are looked up from a persistent library, not re-supplied per encounter).
 */
const rawEncounterMonsterSchema = z.object({
  groupId: z.string().nullable().optional(),
  id: z.number(),
  uniqueId: z.string(),
  name: z.string(),
  currentHitPoints: z.number(),
  temporaryHitPoints: z.number(),
  maximumHitPoints: z.number(),
  initiative: z.number().nullable().optional(),
})

const rawEncounterGroupSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
})

const rawEncounterPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  classByLine: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
})

const rawEncounterDataSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  roundNum: z.number(),
  turnNum: z.number(),
  monsters: z.array(rawEncounterMonsterSchema),
  groups: z.array(rawEncounterGroupSchema),
  players: z.array(rawEncounterPlayerSchema),
})

export const rawEncounterResponseSchema = z.object({
  data: rawEncounterDataSchema,
})

export type RawEncounterData = z.infer<typeof rawEncounterDataSchema>
