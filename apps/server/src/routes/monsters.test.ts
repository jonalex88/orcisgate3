import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import monsterStatsFixture from '../__fixtures__/sample-monster-stats.json' with { type: 'json' }
import open5eCreaturesFixture from '../__fixtures__/sample-open5e-creatures.json' with { type: 'json' }
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

describe('POST /api/monsters/open5e', () => {
  let db: Db

  beforeEach(() => {
    db = createDb(':memory:')
  })

  it('maps and persists monsters from a real Open5e creature-list page', async () => {
    const res = await request(createApp(db)).post('/api/monsters/open5e').send(open5eCreaturesFixture)

    expect(res.status).toBe(200)
    expect(res.body.imported.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))).toEqual([
      { id: 'open5e:srd_bandit-captain', name: 'Bandit Captain' },
      { id: 'open5e:srd_goblin', name: 'Goblin' },
    ])
    expect(db.getMonsterTemplates(['open5e:srd_goblin'])).toHaveLength(1)
  })

  it('returns 400 for a payload that does not match Open5e’s shape', async () => {
    const res = await request(createApp(db)).post('/api/monsters/open5e').send({ not: 'an open5e payload' })
    expect(res.status).toBe(400)
  })

  it('a monster seeded via Open5e resolves an encounter that references it by name', async () => {
    const app = createApp(db)
    await request(app).post('/api/monsters/open5e').send(open5eCreaturesFixture)

    expect(db.getMonsterTemplateByNormalizedName('goblin')?.id).toBe('open5e:srd_goblin')
  })
})
