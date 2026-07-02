/**
 * Replicates the one request D&D Beyond's own web app makes to load a character sheet — see
 * packages/domain/README.md for why this has to happen server-side (DDB sends no CORS headers
 * for third-party origins) and which endpoint this is. No cobalt-token/private-character support
 * yet — that's a later phase; this only fetches public characters.
 */
export class CharacterNotFoundError extends Error {}
export class CharacterPrivateError extends Error {}

/**
 * D&D Beyond's own uptime/latency isn't something this app controls — without a bound, a slow or
 * stalled upstream response leaves the request (and the player staring at "Connecting…") hanging
 * indefinitely with no error to react to. 10s is generous for a normal character fetch.
 */
const DDB_FETCH_TIMEOUT_MS = 10_000

export async function fetchCharacterFromDdb(characterId: string): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(
      `https://character-service.dndbeyond.com/character/v5/character/${characterId}?includeCustomItems=true`,
      {
        headers: {
          accept: 'application/json',
          'user-agent': 'Mozilla/5.0 (compatible; OrcisGate/0.1; +https://github.com)',
        },
        signal: AbortSignal.timeout(DDB_FETCH_TIMEOUT_MS),
      },
    )
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new Error(`D&D Beyond did not respond within ${DDB_FETCH_TIMEOUT_MS / 1000}s for character ${characterId}`)
    }
    throw error
  }

  if (response.status === 404) {
    throw new CharacterNotFoundError(`No character found with id ${characterId}`)
  }
  if (response.status === 401 || response.status === 403) {
    throw new CharacterPrivateError(
      `Character ${characterId} is private — private-character connect isn't implemented yet`,
    )
  }
  if (!response.ok) {
    throw new Error(`D&D Beyond returned ${response.status} for character ${characterId}`)
  }

  return response.json()
}
