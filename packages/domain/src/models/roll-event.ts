export type ActorRole = 'player' | 'dm'

export interface DiceSpec {
  sides: number
  count: number
}

/**
 * A single dice roll, broadcast to everyone connected to a game (subject to `isHiddenFromPlayers`
 * — see the server's SSE role filtering, not enforced here). Rolled client-side (see dice.ts) and
 * posted to the server to relay; the server doesn't re-roll or verify it.
 */
export interface RollEvent {
  id: string
  gameKey: string
  actorName: string
  actorRole: ActorRole
  characterId: string | null
  label: string
  dice: DiceSpec[]
  results: number[]
  total: number
  isHiddenFromPlayers: boolean
  timestamp: string
}
