export interface CharacterRef {
  characterId: string
}

export interface RawCharacterPayload {
  source: 'ddb-live' | 'ddb-json-import'
  fetchedAt: string
  /**
   * Deliberately untyped: this is D&D Beyond's undocumented, unvalidated JSON.
   * The only place allowed to reach into this shape is CharacterMapper.
   */
  data: unknown
}

export interface CharacterDataSource {
  fetchCharacter(ref: CharacterRef): Promise<RawCharacterPayload>
}
