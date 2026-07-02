export interface CharacterRef {
  characterId: string
  /** Bypasses the server's response cache — used by "re-import my character" to pick up sheet edits immediately. */
  forceRefresh?: boolean
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
