import type { ActorRole, Encounter, GameEvent, MonsterTemplate, RollEvent } from '@orcisgate/domain'
import type { Response } from 'express'

const MAX_ROLL_LOG = 200

interface SseClient {
  res: Response
  role: ActorRole
}

export interface GameRoom {
  key: string
  activeEncounter: Encounter | null
  activeEncounterMonsters: MonsterTemplate[]
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
      moodImageUrl: room.moodImageUrl,
      rollLog: visibleRollLog(room, client.role),
    },
  })
}

export function removeClient(room: GameRoom, client: SseClient): void {
  room.sseClients.delete(client)
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
