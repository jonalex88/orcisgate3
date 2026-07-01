import type { AddressInfo } from 'node:net'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import sampleEncounter from '../__fixtures__/sample-encounter.json' with { type: 'json' }
import monsterStatsFixture from '../__fixtures__/sample-monster-stats.json' with { type: 'json' }
import { createApp } from '../app.js'
import { createDb, type Db } from '../db.js'

let keyCounter = 0
function uniqueKey() {
  return `test-game-${Date.now()}-${keyCounter++}`
}

function makeApp(): { app: ReturnType<typeof createApp>; db: Db } {
  const db = createDb(':memory:')
  return { app: createApp(db), db }
}

describe('POST /api/games/:key/rolls', () => {
  it('broadcasts a roll and returns it with a generated id/timestamp', async () => {
    const { app } = makeApp()
    const res = await request(app).post(`/api/games/${uniqueKey()}/rolls`).send({
      actorName: 'Test Adventurer',
      actorRole: 'player',
      characterId: '167672386',
      label: 'Attack Roll',
      dice: [{ sides: 20, count: 1 }],
      results: [15],
      total: 15,
    })

    expect(res.status).toBe(201)
    expect(res.body.roll).toMatchObject({ actorName: 'Test Adventurer', total: 15 })
    expect(res.body.roll.id).toBeTruthy()
    expect(res.body.roll.timestamp).toBeTruthy()
  })

  it('rejects a malformed roll payload', async () => {
    const { app } = makeApp()
    const res = await request(app).post(`/api/games/${uniqueKey()}/rolls`).send({ actorName: 'X' })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/games/:key/encounters and roll-initiative', () => {
  it('activates an encounter in the room, resolving already-known monsters', async () => {
    const { app } = makeApp()
    await request(app).post('/api/monsters').send(monsterStatsFixture)

    const key = uniqueKey()
    const res = await request(app).post(`/api/games/${key}/encounters`).send(sampleEncounter)

    expect(res.status).toBe(200)
    expect(res.body.missingMonsterIds).toEqual([])
    expect(res.body.encounter.monsters).toHaveLength(6)
  })

  it('rolls initiative for every monster and player once an encounter is active', async () => {
    const { app } = makeApp()
    await request(app).post('/api/monsters').send(monsterStatsFixture)
    const key = uniqueKey()
    const activateRes = await request(app).post(`/api/games/${key}/encounters`).send(sampleEncounter)
    const encounterId = activateRes.body.encounter.id

    const res = await request(app).post(`/api/games/${key}/encounters/${encounterId}/roll-initiative`)

    expect(res.status).toBe(200)
    expect(res.body.encounter.monsters.every((m: { initiative: number }) => typeof m.initiative === 'number')).toBe(
      true,
    )
    expect(res.body.encounter.players.every((p: { initiative: number }) => typeof p.initiative === 'number')).toBe(
      true,
    )
  })

  it('returns 404 rolling initiative for an encounter that is not the active one', async () => {
    const { app } = makeApp()
    const res = await request(app)
      .post(`/api/games/${uniqueKey()}/encounters/does-not-exist/roll-initiative`)
    expect(res.status).toBe(404)
  })

  it('exiting the active encounter clears it, so roll-initiative then 404s', async () => {
    const { app } = makeApp()
    await request(app).post('/api/monsters').send(monsterStatsFixture)
    const key = uniqueKey()
    const activateRes = await request(app).post(`/api/games/${key}/encounters`).send(sampleEncounter)
    const encounterId = activateRes.body.encounter.id

    const exitRes = await request(app).post(`/api/games/${key}/encounters/${encounterId}/exit`)
    expect(exitRes.status).toBe(204)

    const rollRes = await request(app).post(`/api/games/${key}/encounters/${encounterId}/roll-initiative`)
    expect(rollRes.status).toBe(404)
  })
})

describe('POST /api/games/:key/mood-image and /settings', () => {
  it('accepts a mood image url', async () => {
    const { app } = makeApp()
    const res = await request(app)
      .post(`/api/games/${uniqueKey()}/mood-image`)
      .send({ url: 'https://example.com/tavern.jpg' })
    expect(res.status).toBe(204)
  })

  it('accepts a settings update', async () => {
    const { app } = makeApp()
    const res = await request(app)
      .post(`/api/games/${uniqueKey()}/settings`)
      .send({ showDmRollsToPlayers: true })
    expect(res.status).toBe(204)
  })
})

describe('GET /api/games/:key/events (SSE)', () => {
  it('streams a snapshot event immediately on connect', async () => {
    const { app } = makeApp()
    const server = app.listen(0)
    const port = (server.address() as AddressInfo).port

    try {
      const controller = new AbortController()
      const response = await fetch(`http://localhost:${port}/api/games/${uniqueKey()}/events?role=player`, {
        signal: controller.signal,
      })
      const reader = response.body!.getReader()
      const { value } = await reader.read()
      controller.abort()

      const text = new TextDecoder().decode(value)
      expect(text).toContain('"type":"snapshot"')
    } finally {
      server.close()
    }
  })
})
