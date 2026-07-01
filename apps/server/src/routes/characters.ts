import { Router } from 'express'
import type { Db } from '../db.js'
import { CharacterNotFoundError, CharacterPrivateError, fetchCharacterFromDdb } from '../ddb-client.js'

const CACHE_TTL_MS = 5 * 60 * 1000
const CHARACTER_ID_PATTERN = /^\d+$/

export function createCharactersRouter(db: Db): Router {
  const router = Router()

  router.get('/:id', async (req, res) => {
    const { id } = req.params

    if (!id || !CHARACTER_ID_PATTERN.test(id)) {
      res.status(400).json({ error: 'Character id must be numeric' })
      return
    }

    const cached = db.getCachedCharacter(id, CACHE_TTL_MS)
    if (cached) {
      res.json(cached)
      return
    }

    try {
      const payload = await fetchCharacterFromDdb(id)
      db.setCachedCharacter(id, payload)
      res.json(payload)
    } catch (error) {
      if (error instanceof CharacterNotFoundError) {
        res.status(404).json({ error: error.message })
      } else if (error instanceof CharacterPrivateError) {
        res.status(403).json({ error: error.message })
      } else {
        res
          .status(502)
          .json({ error: error instanceof Error ? error.message : 'Unknown error fetching character' })
      }
    }
  })

  return router
}
