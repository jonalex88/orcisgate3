import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { createDb } from './db.js'

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const res = await request(createApp(createDb(':memory:'))).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})
