import { afterEach, describe, expect, it, vi } from 'vitest'
import { CharacterNotFoundError, CharacterPrivateError, fetchCharacterFromDdb } from './ddb-client.js'

describe('fetchCharacterFromDdb', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests the real character-service endpoint with includeCustomItems=true', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: {} }) })
    vi.stubGlobal('fetch', fetchMock)

    await fetchCharacterFromDdb('167672386')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://character-service.dndbeyond.com/character/v5/character/167672386?includeCustomItems=true',
      expect.any(Object),
    )
  })

  it('throws CharacterNotFoundError on a 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    await expect(fetchCharacterFromDdb('0')).rejects.toBeInstanceOf(CharacterNotFoundError)
  })

  it('throws CharacterPrivateError on a 401 or 403', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))
    await expect(fetchCharacterFromDdb('167672386')).rejects.toBeInstanceOf(CharacterPrivateError)
  })

  it('throws a generic error on other non-ok statuses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(fetchCharacterFromDdb('167672386')).rejects.toThrow('500')
  })

  it('surfaces a clear error when D&D Beyond does not respond in time, rather than hanging', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('The operation was aborted.', 'TimeoutError')))
    await expect(fetchCharacterFromDdb('167672386')).rejects.toThrow('did not respond within 10s')
  })
})
