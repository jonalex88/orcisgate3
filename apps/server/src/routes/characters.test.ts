import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../app.js'
import { createDb, type Db } from '../db.js'
import { CharacterNotFoundError, CharacterPrivateError } from '../ddb-client.js'

const { fetchCharacterFromDdb } = vi.hoisted(() => ({ fetchCharacterFromDdb: vi.fn() }))
vi.mock('../ddb-client.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../ddb-client.js')>()),
  fetchCharacterFromDdb,
}))

describe('GET /api/characters/:id', () => {
  let db: Db

  beforeEach(() => {
    db = createDb(':memory:')
    fetchCharacterFromDdb.mockReset()
  })

  it('rejects a non-numeric id without calling D&D Beyond', async () => {
    const res = await request(createApp(db)).get('/api/characters/not-a-number')
    expect(res.status).toBe(400)
    expect(fetchCharacterFromDdb).not.toHaveBeenCalled()
  })

  it('fetches and caches a character on first request', async () => {
    fetchCharacterFromDdb.mockResolvedValue({ data: { id: 167672386, name: 'Nathaniel Twinty' } })

    const res = await request(createApp(db)).get('/api/characters/167672386')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ data: { id: 167672386, name: 'Nathaniel Twinty' } })
    expect(fetchCharacterFromDdb).toHaveBeenCalledWith('167672386')
  })

  it('serves the second request from cache without calling D&D Beyond again', async () => {
    fetchCharacterFromDdb.mockResolvedValue({ data: { id: 167672386, name: 'Nathaniel Twinty' } })
    const app = createApp(db)

    await request(app).get('/api/characters/167672386')
    const res = await request(app).get('/api/characters/167672386')

    expect(res.status).toBe(200)
    expect(fetchCharacterFromDdb).toHaveBeenCalledTimes(1)
  })

  it('?refresh=true bypasses the cache and re-fetches from D&D Beyond', async () => {
    fetchCharacterFromDdb.mockResolvedValue({ data: { id: 167672386, name: 'Nathaniel Twinty' } })
    const app = createApp(db)

    await request(app).get('/api/characters/167672386')
    fetchCharacterFromDdb.mockResolvedValue({ data: { id: 167672386, name: 'Nathaniel Twinty II' } })
    const res = await request(app).get('/api/characters/167672386?refresh=true')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ data: { id: 167672386, name: 'Nathaniel Twinty II' } })
    expect(fetchCharacterFromDdb).toHaveBeenCalledTimes(2)
  })

  it('returns 404 when the character does not exist', async () => {
    fetchCharacterFromDdb.mockRejectedValue(new CharacterNotFoundError('not found'))
    const res = await request(createApp(db)).get('/api/characters/999999999')
    expect(res.status).toBe(404)
  })

  it('returns 403 when the character is private', async () => {
    fetchCharacterFromDdb.mockRejectedValue(new CharacterPrivateError('private'))
    const res = await request(createApp(db)).get('/api/characters/167672386')
    expect(res.status).toBe(403)
  })
})
