import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { createDb, type Db } from './db.js'

describe('createApp SPA serving', () => {
  let db: Db

  beforeEach(() => {
    db = createDb(':memory:')
  })

  afterEach(() => {
    db.close()
  })

  it('does not register SPA routes when the web dist directory does not exist', async () => {
    const app = createApp(db, { webDistPath: path.join(tmpdir(), 'orcisgate-does-not-exist') })
    const res = await request(app).get('/')
    expect(res.status).toBe(404)
  })

  it('serves the built SPA, including a fallback to index.html for client-side routes', async () => {
    const distDir = mkdtempSync(path.join(tmpdir(), 'orcisgate-web-dist-'))
    writeFileSync(path.join(distDir, 'index.html'), '<html><body>SPA shell</body></html>')
    writeFileSync(path.join(distDir, 'app.js'), 'console.log("hi")')

    try {
      const app = createApp(db, { webDistPath: distDir })

      const root = await request(app).get('/')
      expect(root.status).toBe(200)
      expect(root.text).toContain('SPA shell')

      const asset = await request(app).get('/app.js')
      expect(asset.status).toBe(200)
      expect(asset.text).toContain('console.log')

      const clientRoute = await request(app).get('/game/abc123/dm')
      expect(clientRoute.status).toBe(200)
      expect(clientRoute.text).toContain('SPA shell')
    } finally {
      rmSync(distDir, { recursive: true, force: true })
    }
  })

  it('still 404s a nonexistent API route instead of falling back to the SPA shell', async () => {
    const distDir = mkdtempSync(path.join(tmpdir(), 'orcisgate-web-dist-'))
    writeFileSync(path.join(distDir, 'index.html'), '<html><body>SPA shell</body></html>')

    try {
      const app = createApp(db, { webDistPath: distDir })
      const res = await request(app).get('/api/this-route-does-not-exist')
      expect(res.status).toBe(404)
      expect(res.text).not.toContain('SPA shell')
    } finally {
      rmSync(distDir, { recursive: true, force: true })
    }
  })
})
