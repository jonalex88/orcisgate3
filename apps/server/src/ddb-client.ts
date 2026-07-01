/**
 * Replicates the one request D&D Beyond's own web app makes to load a character sheet — see
 * packages/domain/README.md for why this has to happen server-side (DDB sends no CORS headers
 * for third-party origins) and which endpoint this is. No cobalt-token/private-character support
 * yet — that's a later phase; this only fetches public characters.
 */
export class CharacterNotFoundError extends Error {}
export class CharacterPrivateError extends Error {}

export async function fetchCharacterFromDdb(characterId: string): Promise<unknown> {
  const response = await fetch(
    `https://character-service.dndbeyond.com/character/v5/character/${characterId}?includeCustomItems=true`,
    {
      headers: {
        accept: 'application/json',
        'user-agent': 'Mozilla/5.0 (compatible; OrcisGate/0.1; +https://github.com)',
      },
    },
  )

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
