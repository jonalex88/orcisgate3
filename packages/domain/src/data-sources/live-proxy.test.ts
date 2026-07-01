import { afterEach, describe, expect, it, vi } from 'vitest'
import { LiveProxyDataSource, LiveProxyFetchError } from './live-proxy.js'

describe('LiveProxyDataSource', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches from the local proxy endpoint and wraps the result as ddb-live', async () => {
    const payload = { data: { id: 167672386, name: 'Nathaniel Twinty' } }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => payload }),
    )

    const result = await new LiveProxyDataSource().fetchCharacter({ characterId: '167672386' })

    expect(result.source).toBe('ddb-live')
    expect(result.data).toEqual(payload)
    expect(fetch).toHaveBeenCalledWith('/api/characters/167672386')
  })

  it('throws LiveProxyFetchError with the server-provided message on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: 'not found' }) }),
    )

    await expect(new LiveProxyDataSource().fetchCharacter({ characterId: '0' })).rejects.toMatchObject({
      message: 'not found',
      status: 404,
    })
  })

  it('prefixes requests with the given base URL', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {} }) }))

    await new LiveProxyDataSource('http://localhost:3001').fetchCharacter({ characterId: '167672386' })

    expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/characters/167672386')
  })

  it('is exported so callers can check error instances', () => {
    expect(new LiveProxyFetchError('x', 500)).toBeInstanceOf(Error)
  })
})
