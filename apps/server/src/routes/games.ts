import { abilityModifier, rollDie, type ActorRole, type Encounter, type RollEvent } from '@orcisgate/domain'
import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import type { Db } from '../db.js'
import { resolveEncounterImport } from '../encounter-import.js'
import {
  activateEncounter,
  addClient,
  addRoll,
  exitEncounter,
  getOrCreateRoom,
  removeClient,
  rollInitiativeForConnectedPlayers,
  setMoodImage,
  setShowDmRollsToPlayers,
  updateActiveEncounter,
  upsertConnectedPlayer,
} from '../game-room.js'

function parseRole(value: unknown): ActorRole {
  return value === 'dm' ? 'dm' : 'player'
}

function queryString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function isValidRollBody(body: unknown): body is Omit<RollEvent, 'id' | 'gameKey' | 'timestamp'> {
  if (!body || typeof body !== 'object') return false
  const b = body as Record<string, unknown>
  return (
    typeof b['actorName'] === 'string' &&
    (b['actorRole'] === 'player' || b['actorRole'] === 'dm') &&
    typeof b['label'] === 'string' &&
    Array.isArray(b['dice']) &&
    Array.isArray(b['results']) &&
    typeof b['total'] === 'number'
  )
}

export function createGamesRouter(db: Db): Router {
  const router = Router()

  router.get('/:key/events', (req, res) => {
    const room = getOrCreateRoom(req.params.key!)
    const role = parseRole(req.query['role'])
    const characterId = queryString(req.query['characterId'])
    const client = { res, role, characterId }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })

    addClient(room, client)

    // The SSE connection doubles as "this player is at the table" — connect = join the roster,
    // disconnect (see removeClient) = leave it. A page refresh just reconnects and re-announces.
    if (role === 'player' && characterId) {
      upsertConnectedPlayer(
        room,
        {
          characterId,
          name: queryString(req.query['name']) ?? 'Unknown',
          classByLine: queryString(req.query['classByLine']) ?? '',
          avatarUrl: queryString(req.query['avatarUrl']),
          initiative: null,
        },
        client,
      )
    }

    req.on('close', () => removeClient(room, client))
  })

  router.post('/:key/rolls', (req, res) => {
    if (!isValidRollBody(req.body)) {
      res.status(400).json({ error: 'Invalid roll payload' })
      return
    }

    const room = getOrCreateRoom(req.params.key!)
    const roll: RollEvent = {
      id: randomUUID(),
      gameKey: req.params.key!,
      timestamp: new Date().toISOString(),
      actorName: req.body.actorName,
      actorRole: req.body.actorRole,
      characterId: req.body.characterId ?? null,
      label: req.body.label,
      dice: req.body.dice,
      results: req.body.results,
      total: req.body.total,
      isHiddenFromPlayers: Boolean(req.body.isHiddenFromPlayers),
    }
    addRoll(room, roll)
    res.status(201).json({ roll })
  })

  router.post('/:key/encounters', (req, res) => {
    let resolved
    try {
      resolved = resolveEncounterImport(db, req.body)
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid encounter JSON' })
      return
    }

    const room = getOrCreateRoom(req.params.key!)
    activateEncounter(room, resolved.encounter, resolved.monsters)
    res.json(resolved)
  })

  router.post('/:key/encounters/:encounterId/roll-initiative', (req, res) => {
    const room = getOrCreateRoom(req.params.key!)
    if (!room.activeEncounter || room.activeEncounter.id !== req.params.encounterId) {
      res.status(404).json({ error: 'No matching active encounter for this game' })
      return
    }

    const templatesById = new Map(room.activeEncounterMonsters.map((m) => [m.id, m]))
    const updatedEncounter: Encounter = {
      ...room.activeEncounter,
      monsters: room.activeEncounter.monsters.map((monster) => {
        const template = templatesById.get(monster.templateId)
        const dexModifier = template ? abilityModifier(template.abilityScores.dexterity) : 0
        return { ...monster, initiative: rollDie(20) + dexModifier }
      }),
    }

    // Simplification: connected players roll a flat d20 here (no Dex modifier) since the room
    // doesn't hold live character ability scores — a player can still roll their own initiative
    // with their real modifier via the dice tray and it'll show correctly in the roll log either
    // way. Rolls for whoever's actually connected right now, not the encounter's own imported
    // (and often stale/unrelated) player roster.
    rollInitiativeForConnectedPlayers(room, () => rollDie(20))

    updateActiveEncounter(room, updatedEncounter)
    res.json({ encounter: updatedEncounter })
  })

  router.post('/:key/encounters/:encounterId/exit', (req, res) => {
    const room = getOrCreateRoom(req.params.key!)
    if (room.activeEncounter?.id === req.params.encounterId) {
      exitEncounter(room)
    }
    res.status(204).end()
  })

  router.post('/:key/mood-image', (req, res) => {
    const url = typeof req.body?.url === 'string' ? req.body.url : null
    setMoodImage(getOrCreateRoom(req.params.key!), url)
    res.status(204).end()
  })

  router.post('/:key/settings', (req, res) => {
    setShowDmRollsToPlayers(getOrCreateRoom(req.params.key!), Boolean(req.body?.showDmRollsToPlayers))
    res.status(204).end()
  })

  return router
}
