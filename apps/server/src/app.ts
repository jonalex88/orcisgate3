import cors from 'cors'
import express, { type Express } from 'express'
import { existsSync } from 'node:fs'
import path from 'node:path'
import type { Db } from './db.js'
import { createCharactersRouter } from './routes/characters.js'
import { createEncountersRouter } from './routes/encounters.js'
import { createGamesRouter } from './routes/games.js'
import { createMonstersRouter } from './routes/monsters.js'

const DEFAULT_WEB_DIST = path.join(import.meta.dirname, '../../web/dist')

export interface CreateAppOptions {
  /** Overridable for tests; defaults to the built apps/web/dist sitting next to this package. */
  webDistPath?: string
}

export function createApp(db: Db, options: CreateAppOptions = {}): Express {
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

  /**
   * One-service deploy (e.g. Railway): this same process also serves the built SPA, so there's
   * one origin, no CORS to configure between two separate deploys, and the frontend's relative
   * `/api/...` calls work unmodified in production exactly like they do against the Vite dev
   * proxy locally. Guarded by existence so `npm run dev:server` keeps working standalone without
   * apps/web ever being built. The regex excludes `/api/*` from the SPA catch-all so a mistyped
   * or removed API route still 404s properly instead of silently returning the app shell.
   */
  const webDist = options.webDistPath ?? DEFAULT_WEB_DIST
  if (existsSync(webDist)) {
    app.use(express.static(webDist))
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(path.join(webDist, 'index.html'))
    })
  }

  return app
}
