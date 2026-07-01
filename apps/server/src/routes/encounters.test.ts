import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import sampleEncounter from '../__fixtures__/sample-encounter.json' with { type: 'json' }
import monsterStatsFixture from '../__fixtures__/sample-monster-stats.json' with { type: 'json' }
import { createApp } from '../app.js'
import { createDb, type Db } from '../db.js'

describe('POST /api/encounters', () => {
  let db: Db

  beforeEach(() => {
    db = createDb(':memory:')
  })

  it('reports every referenced monster as missing when the library is empty', async () => {
    const res = await request(createApp(db)).post('/api/encounters').send(sampleEncounter)

    expect(res.status).toBe(200)
    expect(res.body.missingMonsterIds.sort()).toEqual(['16798', '16799'])
    expect(res.body.monsters).toEqual([])
    expect(res.body.encounter.monsters).toHaveLength(6)
  })

  it('auto-resolves monsters that were already pasted in a previous, unrelated request', async () => {
    const app = createApp(db)
    await request(app).post('/api/monsters').send(monsterStatsFixture)

    const res = await request(app).post('/api/encounters').send(sampleEncounter)

    expect(res.body.missingMonsterIds).toEqual([])
    expect(res.body.monsters.map((m: { name: string }) => m.name).sort()).toEqual([
      'Bandit',
      'Bandit Captain',
    ])
  })

  it('returns 400 for a payload that does not match the expected shape', async () => {
    const res = await request(createApp(db)).post('/api/encounters').send({ not: 'an encounter' })
    expect(res.status).toBe(400)
  })
})
