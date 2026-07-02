import type { ActorRole, ConnectedPlayer, Encounter, GameEvent, MonsterTemplate, RollEvent } from '@orcisgate/domain'
import { useEffect, useState } from 'react'

export interface GameEventsState {
  connected: boolean
  activeEncounter: Encounter | null
  activeEncounterMonsters: MonsterTemplate[]
  connectedPlayers: ConnectedPlayer[]
  moodImageUrl: string | null
  rollLog: RollEvent[]
}

export interface PlayerConnectionInfo {
  characterId: string
  name: string
  classByLine: string
  avatarUrl: string | null
}

const INITIAL_STATE: GameEventsState = {
  connected: false,
  activeEncounter: null,
  activeEncounterMonsters: [],
  connectedPlayers: [],
  moodImageUrl: null,
  rollLog: [],
}

/**
 * Subscribes to a game's Server-Sent Events stream. Role-based hiding of DM rolls is enforced
 * server-side (see apps/server/src/game-room.ts) — this hook just renders whatever the server
 * decided to send. For players, the connection itself doubles as "announce I'm at the table" —
 * see game-room.ts's connect/disconnect roster tracking — so `playerInfo` should be passed once
 * the character has actually loaded (a reconnect happens automatically when it becomes available).
 */
export function useGameEvents(gameKey: string, role: ActorRole, playerInfo?: PlayerConnectionInfo): GameEventsState {
  const [state, setState] = useState<GameEventsState>(INITIAL_STATE)

  useEffect(() => {
    setState(INITIAL_STATE)

    const params = new URLSearchParams({ role })
    if (playerInfo) {
      params.set('characterId', playerInfo.characterId)
      params.set('name', playerInfo.name)
      params.set('classByLine', playerInfo.classByLine)
      if (playerInfo.avatarUrl) params.set('avatarUrl', playerInfo.avatarUrl)
    }
    const source = new EventSource(`/api/games/${gameKey}/events?${params.toString()}`)

    source.onopen = () => setState((s) => ({ ...s, connected: true }))
    source.onerror = () => setState((s) => ({ ...s, connected: false }))

    source.onmessage = (message: MessageEvent<string>) => {
      const event = JSON.parse(message.data) as GameEvent
      setState((s) => {
        switch (event.type) {
          case 'snapshot':
            return {
              connected: true,
              activeEncounter: event.snapshot.activeEncounter,
              activeEncounterMonsters: event.snapshot.activeEncounterMonsters,
              connectedPlayers: event.snapshot.connectedPlayers,
              moodImageUrl: event.snapshot.moodImageUrl,
              rollLog: event.snapshot.rollLog,
            }
          case 'roll':
            return { ...s, rollLog: [...s.rollLog, event.roll] }
          case 'encounter-activated':
            return { ...s, activeEncounter: event.encounter, activeEncounterMonsters: event.monsters }
          case 'encounter-exited':
            return { ...s, activeEncounter: null, activeEncounterMonsters: [] }
          case 'mood-image':
            return { ...s, moodImageUrl: event.url }
          case 'roster-updated':
            return { ...s, connectedPlayers: event.connectedPlayers }
          default:
            return s
        }
      })
    }

    return () => source.close()
  }, [gameKey, role, playerInfo?.characterId, playerInfo?.name, playerInfo?.classByLine, playerInfo?.avatarUrl])

  return state
}
