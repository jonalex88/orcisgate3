import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import monsterStatsFixture from '../__fixtures__/sample-monster-stats.json' with { type: 'json' }
import { createApp } from '../app.js'
import { createDb, type Db } from '../db.js'

describe('POST /api/monsters', () => {
  let db: Db

  beforeEach(() => {
    db = createDb(':memory:')
  })

  it('maps and persists monster stat blocks from a real DDB payload', async () => {
    const res = await request(createApp(db)).post('/api/monsters').send(monsterStatsFixture)

    expect(res.status).toBe(200)
    expect(res.body.imported).toEqual([
      { id: '16798', name: 'Bandit' },
      { id: '16799', name: 'Bandit Captain' },
    ])
    expect(db.getMonsterTemplates(['16798', '16799'])).toHaveLength(2)
  })

  it('returns 400 for a payload that does not match the expected shape', async () => {
    const res = await request(createApp(db)).post('/api/monsters').send({ not: 'a monster payload' })
    expect(res.status).toBe(400)
  })

  it('persists across separate requests (a monster only needs to be pasted once)', async () => {
    const app = createApp(db)
    await request(app).post('/api/monsters').send(monsterStatsFixture)

    expect(db.getMonsterTemplates(['16798'])).toHaveLength(1)
  })
})
