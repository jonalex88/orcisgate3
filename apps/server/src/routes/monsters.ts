import { mapMonsters, mapOpen5eCreatureList } from '@orcisgate/domain'
import { Router } from 'express'
import type { Db } from '../db.js'

/**
 * DM Settings' bulk-import box and the per-encounter "paste these monster stat blocks too" flow
 * both hit this same endpoint — a monster template only ever needs to be pasted once, globally
 * (see db.ts upsertMonsterTemplates), so there's no reason to distinguish the two call sites here.
 *
 * `/open5e` is a separate sub-route rather than auto-detecting the shape of `/` — the payloads
 * aren't ambiguous enough to risk a misdetection silently mapping one source's data through the
 * other's parser. It exists for `scripts/seed-open5e.mjs` (a starter monster library seeded from
 * Open5e — see packages/domain/README.md for why that needs a name-match fallback rather than
 * D&D Beyond's own id scheme) but works for anyone POSTing an Open5e creature-list page directly.
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

  router.post('/open5e', (req, res) => {
    let templates
    try {
      templates = mapOpen5eCreatureList(req.body)
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid Open5e creature-list JSON' })
      return
    }

    db.upsertMonsterTemplates(templates)
    res.json({ imported: templates.map((t) => ({ id: t.id, name: t.name })) })
  })

  return router
}
