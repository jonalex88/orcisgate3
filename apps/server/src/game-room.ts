import type { ActorRole, ConnectedPlayer, Encounter, GameEvent, MonsterTemplate, RollEvent } from '@orcisgate/domain'
import type { Response } from 'express'

const MAX_ROLL_LOG = 200
/**
 * How long a disconnected player stays on the roster before being removed for real. A page
 * refresh (or a brief network hiccup) closes the old SSE connection and opens a new one, but
 * there's no guarantee the new one's "hello, I'm back" arrives before the old one's close event —
 * it can go either way. Delaying removal gives the reconnect time to cancel it.
 */
const PLAYER_REMOVAL_GRACE_MS = 5000

interface SseClient {
  res: Response
  role: ActorRole
  /** Only set for player connections — lets a disconnect remove exactly this player from the roster. */
  characterId: string | null
}

export interface GameRoom {
  key: string
  activeEncounter: Encounter | null
  activeEncounterMonsters: MonsterTemplate[]
  /** Who's actually connected right now, keyed by characterId — see ConnectedPlayer's doc comment. */
  connectedPlayers: Map<string, ConnectedPlayer>
  /**
   * Which SSE connection currently "owns" each characterId — needed to avoid a race on refresh:
   * the browser opens a new connection before the old one's close event fires, so a naive
   * disconnect-removes-from-roster rule would wrongly evict a player who just reconnected. Only
   * the client that's still the recorded owner is allowed to remove itself.
   */
  playerConnectionOwners: Map<string, SseClient>
  /** Pending grace-period removal timers, keyed by characterId — see PLAYER_REMOVAL_GRACE_MS. */
  pendingRemovals: Map<string, ReturnType<typeof setTimeout>>
  moodImageUrl: string | null
  rollLog: RollEvent[]
  /** DM Settings' "show my rolls to the underlings" toggle — off by default. */
  showDmRollsToPlayers: boolean
  sseClients: Set<SseClient>
}

/**
 * In-memory only for this phase (see the plan) — a server restart loses who's connected and
 * what round you're on, but never monster data (that's in SQLite) or character data. Keyed by
 * the DM's "magic key" from the join screen; created lazily on first join, by either role.
 */
const rooms = new Map<string, GameRoom>()

export function getOrCreateRoom(key: string): GameRoom {
  let room = rooms.get(key)
  if (!room) {
    room = {
      key,
      activeEncounter: null,
      activeEncounterMonsters: [],
      connectedPlayers: new Map(),
      playerConnectionOwners: new Map(),
      pendingRemovals: new Map(),
      moodImageUrl: null,
      rollLog: [],
      showDmRollsToPlayers: false,
      sseClients: new Set(),
    }
    rooms.set(key, room)
  }
  return room
}

function canRoleSeeRoll(room: GameRoom, role: ActorRole, roll: RollEvent): boolean {
  if (role === 'dm') return true
  if (!roll.isHiddenFromPlayers) return true
  return room.showDmRollsToPlayers
}

function visibleRollLog(room: GameRoom, role: ActorRole): RollEvent[] {
  return room.rollLog.filter((roll) => canRoleSeeRoll(room, role, roll))
}

function sendEvent(client: SseClient, event: GameEvent): void {
  client.res.write(`data: ${JSON.stringify(event)}\n\n`)
}

/**
 * Registers an SSE connection and immediately sends it a snapshot of current room state —
 * role-filtered here too, not just on live events, so a player who joins mid-session never sees
 * a hidden DM roll that happened before they connected.
 */
export function addClient(room: GameRoom, client: SseClient): void {
  room.sseClients.add(client)
  sendEvent(client, {
    type: 'snapshot',
    snapshot: {
      role: client.role,
      activeEncounter: room.activeEncounter,
      activeEncounterMonsters: room.activeEncounterMonsters,
      connectedPlayers: [...room.connectedPlayers.values()],
      moodImageUrl: room.moodImageUrl,
      rollLog: visibleRollLog(room, client.role),
    },
  })
}

export function removeClient(room: GameRoom, client: SseClient): void {
  room.sseClients.delete(client)
  const characterId = client.characterId
  if (!characterId || room.playerConnectionOwners.get(characterId) !== client) return

  // Don't remove immediately — a reconnect (page refresh) might still be on its way and could
  // arrive either before or after this close event. Schedule the removal, but only carry it out
  // if nothing has reclaimed ownership of this characterId by the time it fires.
  const timer = setTimeout(() => {
    room.pendingRemovals.delete(characterId)
    if (room.playerConnectionOwners.get(characterId) === client) {
      room.playerConnectionOwners.delete(characterId)
      removeConnectedPlayer(room, characterId)
    }
  }, PLAYER_REMOVAL_GRACE_MS)
  room.pendingRemovals.set(characterId, timer)
}

function broadcast(room: GameRoom, event: GameEvent): void {
  for (const client of room.sseClients) {
    if (event.type === 'roll' && !canRoleSeeRoll(room, client.role, event.roll)) continue
    sendEvent(client, event)
  }
}

export function addRoll(room: GameRoom, roll: RollEvent): void {
  room.rollLog.push(roll)
  if (room.rollLog.length > MAX_ROLL_LOG) room.rollLog.shift()
  broadcast(room, { type: 'roll', roll })
}

export function activateEncounter(room: GameRoom, encounter: Encounter, monsters: MonsterTemplate[]): void {
  room.activeEncounter = encounter
  room.activeEncounterMonsters = monsters
  broadcast(room, { type: 'encounter-activated', encounter, monsters })
}

/** Re-broadcasts the active encounter after an in-place mutation (e.g. initiative rolled, HP changed). */
export function updateActiveEncounter(room: GameRoom, encounter: Encounter): void {
  room.activeEncounter = encounter
  broadcast(room, { type: 'encounter-activated', encounter, monsters: room.activeEncounterMonsters })
}

export function exitEncounter(room: GameRoom): void {
  room.activeEncounter = null
  room.activeEncounterMonsters = []
  broadcast(room, { type: 'encounter-exited' })
}

export function setMoodImage(room: GameRoom, url: string | null): void {
  room.moodImageUrl = url
  broadcast(room, { type: 'mood-image', url })
}

export function setShowDmRollsToPlayers(room: GameRoom, value: boolean): void {
  room.showDmRollsToPlayers = value
}

/**
 * Called when a player's SSE connection opens (and again on every reconnect, e.g. a page
 * refresh). Preserves any initiative already rolled for this player rather than resetting it —
 * a refresh mid-combat shouldn't knock them out of the current initiative order.
 */
export function upsertConnectedPlayer(room: GameRoom, player: ConnectedPlayer, client: SseClient): void {
  const pendingRemoval = room.pendingRemovals.get(player.characterId)
  if (pendingRemoval) {
    clearTimeout(pendingRemoval)
    room.pendingRemovals.delete(player.characterId)
  }

  const existing = room.connectedPlayers.get(player.characterId)
  room.playerConnectionOwners.set(player.characterId, client)
  room.connectedPlayers.set(player.characterId, { ...player, initiative: existing?.initiative ?? player.initiative })
  broadcast(room, { type: 'roster-updated', connectedPlayers: [...room.connectedPlayers.values()] })
}

export function removeConnectedPlayer(room: GameRoom, characterId: string): void {
  if (!room.connectedPlayers.delete(characterId)) return
  broadcast(room, { type: 'roster-updated', connectedPlayers: [...room.connectedPlayers.values()] })
}

/** Rolls a d20 for every connected player (used by the DM's "Roll Initiative" action). */
export function rollInitiativeForConnectedPlayers(room: GameRoom, rollDie: () => number): ConnectedPlayer[] {
  for (const player of room.connectedPlayers.values()) {
    player.initiative = rollDie()
  }
  const players = [...room.connectedPlayers.values()]
  broadcast(room, { type: 'roster-updated', connectedPlayers: players })
  return players
}
