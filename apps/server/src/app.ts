import cors from 'cors'
import express, { type Express } from 'express'
import type { Db } from './db.js'
import { createCharactersRouter } from './routes/characters.js'
import { createEncountersRouter } from './routes/encounters.js'
import { createGamesRouter } from './routes/games.js'
import { createMonstersRouter } from './routes/monsters.js'

export function createApp(db: Db): Express {
  const app = express()

  app.use(cors({ origin: process.env['WEB_ORIGIN'] ?? 'http://localhost:5173', credentials: true }))
  // DM Settings' bulk monster-import box can be a large paste (many stat blocks at once).
  app.use(express.json({ limit: '5mb' }))

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api/characters', createCharactersRouter(db))
  app.use('/api/monsters', createMonstersRouter(db))
  app.use('/api/encounters', createEncountersRouter(db))
  app.use('/api/games', createGamesRouter(db))

  return app
}
