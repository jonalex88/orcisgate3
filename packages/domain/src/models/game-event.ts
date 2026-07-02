import type { Encounter } from './encounter.js'
import type { MonsterTemplate } from './monster.js'
import type { ActorRole, RollEvent } from './roll-event.js'

/**
 * A player actually connected to this game right now — distinct from `Encounter.players`, which
 * is just a stale snapshot of whoever was in the party when the DM built the encounter in D&D
 * Beyond. The initiative pane shows this list, not the encounter's own imported one, so "who's at
 * the table" always reflects who's actually connected to this specific game.
 */
export interface ConnectedPlayer {
  characterId: string
  name: string
  classByLine: string
  avatarUrl: string | null
  initiative: number | null
}

/** What a newly-connected SSE client is sent immediately, before any live events. */
export interface GameSnapshot {
  role: ActorRole
  activeEncounter: Encounter | null
  activeEncounterMonsters: MonsterTemplate[]
  connectedPlayers: ConnectedPlayer[]
  moodImageUrl: string | null
  /** Already filtered for this connection's role — a player never receives hidden DM rolls, here or live. */
  rollLog: RollEvent[]
}

export type GameEvent =
  | { type: 'snapshot'; snapshot: GameSnapshot }
  | { type: 'roll'; roll: RollEvent }
  | { type: 'encounter-activated'; encounter: Encounter; monsters: MonsterTemplate[] }
  | { type: 'encounter-exited' }
  | { type: 'mood-image'; url: string | null }
  | { type: 'roster-updated'; connectedPlayers: ConnectedPlayer[] }
