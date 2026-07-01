import { Router } from 'express'
import type { Db } from '../db.js'
import { resolveEncounterImport } from '../encounter-import.js'

/**
 * Standalone preview/import endpoint (not tied to a game) — mostly superseded by
 * `/api/games/:key/encounters` once a DM is actually running a session, but useful on its own for
 * checking what an encounter paste resolves to before joining/creating a game.
 */
export function createEncountersRouter(db: Db): Router {
  const router = Router()

  router.post('/', (req, res) => {
    try {
      res.json(resolveEncounterImport(db, req.body))
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid encounter JSON' })
    }
  })

  return router
}
