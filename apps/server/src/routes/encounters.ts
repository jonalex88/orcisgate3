import { mapEncounter, referencedMonsterTemplateIds } from '@orcisgate/domain'
import { Router } from 'express'
import type { Db } from '../db.js'

/**
 * Importing an encounter resolves every referenced monster id against the persistent library
 * (db.ts) rather than requiring the DM to re-paste stat blocks that were already imported once,
 * anywhere. Anything not found comes back as `missingMonsterIds` — the encounter still loads with
 * whatever it *could* resolve rather than failing the whole import over one unknown monster.
 */
export function createEncountersRouter(db: Db): Router {
  const router = Router()

  router.post('/', (req, res) => {
    let encounter
    try {
      encounter = mapEncounter(req.body)
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid encounter JSON' })
      return
    }

    const referencedIds = referencedMonsterTemplateIds(encounter)
    const monsters = db.getMonsterTemplates(referencedIds)
    const foundIds = new Set(monsters.map((m) => m.id))
    const missingMonsterIds = referencedIds.filter((id) => !foundIds.has(id))

    res.json({ encounter, monsters, missingMonsterIds })
  })

  return router
}
