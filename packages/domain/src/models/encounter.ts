export interface EncounterMonsterInstance {
  uniqueId: string
  templateId: string
  label: string
  groupId: string | null
  currentHp: number
  maxHp: number
  tempHp: number
  initiative: number | null
}

export interface EncounterGroup {
  id: string
  name: string | null
}

/**
 * A player reference as recorded in the imported encounter — HP/name/avatar here are stale
 * placeholders from whenever the encounter was built in D&D Beyond (often all zero). `characterId`
 * is the same id `Character.id` and `/api/characters/:id` use, so once that character is actually
 * connected in a live game, its real data should be preferred over these fields.
 */
export interface EncounterPlayerRef {
  characterId: string
  name: string
  classByLine: string
  avatarUrl: string | null
}

export interface Encounter {
  id: string
  name: string | null
  monsters: EncounterMonsterInstance[]
  groups: EncounterGroup[]
  players: EncounterPlayerRef[]
  roundNum: number
  turnNum: number
}
