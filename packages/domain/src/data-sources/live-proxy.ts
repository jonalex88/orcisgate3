import type { CharacterDataSource, CharacterRef, RawCharacterPayload } from './types.js'

export class LiveProxyFetchError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
  }
}

/**
 * Calls our own server's DDB proxy (apps/server) rather than character-service.dndbeyond.com
 * directly — the browser can't reach that endpoint itself (no CORS headers for third-party
 * origins). See packages/domain/README.md for the full explanation.
 */
export class LiveProxyDataSource implements CharacterDataSource {
  constructor(private readonly baseUrl: string = '') {}

  async fetchCharacter(ref: CharacterRef): Promise<RawCharacterPayload> {
    const response = await fetch(`${this.baseUrl}/api/characters/${ref.characterId}`)

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      const message = (body as { error?: string } | null)?.error ?? `Request failed with status ${response.status}`
      throw new LiveProxyFetchError(message, response.status)
    }

    return {
      source: 'ddb-live',
      fetchedAt: new Date().toISOString(),
      data: await response.json(),
    }
  }
}
