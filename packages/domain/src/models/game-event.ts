import type { Encounter } from './encounter.js'
import type { MonsterTemplate } from './monster.js'
import type { ActorRole, RollEvent } from './roll-event.js'

/** What a newly-connected SSE client is sent immediately, before any live events. */
export interface GameSnapshot {
  role: ActorRole
  activeEncounter: Encounter | null
  activeEncounterMonsters: MonsterTemplate[]
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
