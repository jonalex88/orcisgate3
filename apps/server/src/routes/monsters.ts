import { mapMonsters } from '@orcisgate/domain'
import { Router } from 'express'
import type { Db } from '../db.js'

/**
 * DM Settings' bulk-import box and the per-encounter "paste these monster stat blocks too" flow
 * both hit this same endpoint — a monster template only ever needs to be pasted once, globally
 * (see db.ts upsertMonsterTemplates), so there's no reason to distinguish the two call sites here.
 */
export function createMonstersRouter(db: Db): Router {
  const router = Router()

  router.post('/', (req, res) => {
    let templates
    try {
      templates = mapMonsters(req.body)
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid monster JSON' })
      return
    }

    db.upsertMonsterTemplates(templates)
    res.json({ imported: templates.map((t) => ({ id: t.id, name: t.name })) })
  })

  return router
}
