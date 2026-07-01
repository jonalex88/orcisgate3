import { mapEncounter, referencedMonsterTemplateIds, type Encounter, type MonsterTemplate } from '@orcisgate/domain'
import type { Db } from './db.js'

export interface ResolvedEncounterImport {
  encounter: Encounter
  monsters: MonsterTemplate[]
  missingMonsterIds: string[]
}

/**
 * Shared by the standalone `/api/encounters` preview route and the game-scoped
 * `/api/games/:key/encounters` import route — both need "map the paste, then resolve every
 * referenced monster id against the persistent library" and nothing else differs between them.
 * Throws (from mapEncounter's zod validation) on a payload that doesn't look like a DDB encounter.
 */
export function resolveEncounterImport(db: Db, rawPayload: unknown): ResolvedEncounterImport {
  const encounter = mapEncounter(rawPayload)
  const referencedIds = referencedMonsterTemplateIds(encounter)
  const monsters = db.getMonsterTemplates(referencedIds)
  const foundIds = new Set(monsters.map((m) => m.id))
  const missingMonsterIds = referencedIds.filter((id) => !foundIds.has(id))
  return { encounter, monsters, missingMonsterIds }
}
