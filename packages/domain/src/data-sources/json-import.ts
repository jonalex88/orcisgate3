import type { CharacterDataSource, CharacterRef, RawCharacterPayload } from './types.js'

/**
 * Wraps a JSON blob the user pasted/uploaded (typically copied from the
 * character-service network response) so it can flow through the same
 * CharacterMapper as a live fetch.
 */
export class JsonImportDataSource implements CharacterDataSource {
  constructor(private readonly rawJson: unknown) {}

  async fetchCharacter(_ref: CharacterRef): Promise<RawCharacterPayload> {
    return {
      source: 'ddb-json-import',
      fetchedAt: new Date().toISOString(),
      data: this.rawJson,
    }
  }
}
