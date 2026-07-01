import type { Encounter } from '../models/encounter.js'
import { rawEncounterResponseSchema } from './ddb-encounter-schema.js'

/**
 * Maps a D&D Beyond encounter export into our Encounter model. Doesn't check whether the
 * referenced monster ids actually exist anywhere — that's the server's job (look them up in the
 * persistent monster_templates table, report any it doesn't have yet), since this package has no
 * database access. See ddb-encounter-schema.ts for why encounters and monster stat blocks are
 * mapped separately.
 */
export function mapEncounter(rawPayload: unknown): Encounter {
  const { data } = rawEncounterResponseSchema.parse(rawPayload)

  return {
    id: data.id,
    name: data.name ?? null,
    roundNum: data.roundNum,
    turnNum: data.turnNum,
    monsters: data.monsters.map((m) => ({
      uniqueId: m.uniqueId,
      templateId: String(m.id),
      label: m.name,
      groupId: m.groupId ?? null,
      currentHp: m.currentHitPoints,
      maxHp: m.maximumHitPoints,
      tempHp: m.temporaryHitPoints,
      initiative: m.initiative ?? null,
    })),
    groups: data.groups.map((g) => ({ id: g.id, name: g.name ?? null })),
    players: data.players.map((p) => ({
      characterId: p.id,
      name: p.name,
      classByLine: p.classByLine ?? '',
      avatarUrl: p.avatarUrl ?? null,
    })),
  }
}

/** The distinct monster template ids an encounter references — for the server to look up. */
export function referencedMonsterTemplateIds(encounter: Encounter): string[] {
  return [...new Set(encounter.monsters.map((m) => m.templateId))]
}
