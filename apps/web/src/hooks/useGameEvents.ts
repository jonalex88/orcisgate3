import type { ActorRole, Encounter, GameEvent, MonsterTemplate, RollEvent } from '@orcisgate/domain'
import { useEffect, useState } from 'react'

export interface GameEventsState {
  connected: boolean
  activeEncounter: Encounter | null
  activeEncounterMonsters: MonsterTemplate[]
  moodImageUrl: string | null
  rollLog: RollEvent[]
}

const INITIAL_STATE: GameEventsState = {
  connected: false,
  activeEncounter: null,
  activeEncounterMonsters: [],
  moodImageUrl: null,
  rollLog: [],
}

/**
 * Subscribes to a game's Server-Sent Events stream. Role-based hiding of DM rolls is enforced
 * server-side (see apps/server/src/game-room.ts) — this hook just renders whatever the server
 * decided to send.
 */
export function useGameEvents(gameKey: string, role: ActorRole): GameEventsState {
  const [state, setState] = useState<GameEventsState>(INITIAL_STATE)

  useEffect(() => {
    setState(INITIAL_STATE)
    const source = new EventSource(`/api/games/${gameKey}/events?role=${role}`)

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
          default:
            return s
        }
      })
    }

    return () => source.close()
  }, [gameKey, role])

  return state
}
