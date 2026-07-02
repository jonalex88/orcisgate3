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
 * Longer than the server's own 10s D&D Beyond timeout (ddb-client.ts) — gives the server room to
 * hit its timeout and respond with a real error first. Without this, a stalled connection between
 * browser and server (rather than server and D&D Beyond) would otherwise leave a player staring at
 * "Connecting…" with no error and no way out.
 */
const FETCH_TIMEOUT_MS = 15_000

/**
 * Calls our own server's DDB proxy (apps/server) rather than character-service.dndbeyond.com
 * directly — the browser can't reach that endpoint itself (no CORS headers for third-party
 * origins). See packages/domain/README.md for the full explanation.
 */
export class LiveProxyDataSource implements CharacterDataSource {
  constructor(private readonly baseUrl: string = '') {}

  async fetchCharacter(ref: CharacterRef): Promise<RawCharacterPayload> {
    const query = ref.forceRefresh ? '?refresh=true' : ''
    let response: Response
    try {
      response = await fetch(`${this.baseUrl}/api/characters/${ref.characterId}${query}`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new LiveProxyFetchError('Timed out waiting for a response — the server may be unreachable.', 504)
      }
      throw error
    }

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
