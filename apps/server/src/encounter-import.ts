import {
  mapEncounter,
  normalizeMonsterName,
  referencedMonsterTemplateIds,
  type Encounter,
  type MonsterTemplate,
} from '@orcisgate/domain'
import type { Db } from './db.js'

export interface ResolvedEncounterImport {
  encounter: Encounter
  monsters: MonsterTemplate[]
  missingMonsterIds: string[]
  /**
   * Ids that weren't found by exact D&D Beyond id, but were resolved by matching a normalized
   * monster name instead (e.g. against a pre-seeded compendium entry that doesn't share DDB's id
   * scheme) — a best-effort match, not a guaranteed-correct one. Included in `monsters` (re-keyed
   * under the id the encounter actually asked for) but called out separately so a client can flag
   * "auto-matched by name, worth checking" rather than presenting it as certain.
   */
  nameMatchedMonsterIds: string[]
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

  const exactMatches = db.getMonsterTemplates(referencedIds)
  const foundIds = new Set(exactMatches.map((m) => m.id))
  const unresolvedIds = referencedIds.filter((id) => !foundIds.has(id))

  const nameMatchedMonsterIds: string[] = []
  const missingMonsterIds: string[] = []
  const nameMatches: MonsterTemplate[] = []

  for (const id of unresolvedIds) {
    // Any instance referencing this id has the same underlying monster name (just possibly a
    // different "(A)"/"(B)" disambiguation suffix, which normalizeMonsterName strips) — the first
    // one is as good a representative as any.
    const representativeLabel = encounter.monsters.find((m) => m.templateId === id)?.label ?? ''
    const match = db.getMonsterTemplateByNormalizedName(normalizeMonsterName(representativeLabel))
    if (match) {
      // Re-keyed under the id the encounter actually referenced, so every existing lookup
      // (activeEncounterMonsters.find(m => m.id === instance.templateId)) works unmodified.
      nameMatches.push({ ...match, id })
      nameMatchedMonsterIds.push(id)
    } else {
      missingMonsterIds.push(id)
    }
  }

  return {
    encounter,
    monsters: [...exactMatches, ...nameMatches],
    missingMonsterIds,
    nameMatchedMonsterIds,
  }
}
