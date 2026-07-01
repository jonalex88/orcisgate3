import { rollDice, type DiceSpec } from '@orcisgate/domain'
import { useCallback } from 'react'
import { submitRoll } from '../lib/api.js'

export interface RollActor {
  name: string
  role: 'player' | 'dm'
  characterId: string | null
}

/** Rolls locally (see dice.ts — this is a trust-based tool, the server doesn't re-roll) and posts the result to the shared activity feed. */
export function useRollSubmitter(gameKey: string, actor: RollActor) {
  return useCallback(
    (label: string, dice: DiceSpec[], isHiddenFromPlayers = false) => {
      const { results, total } = rollDice(dice)
      submitRoll(gameKey, {
        actorName: actor.name,
        actorRole: actor.role,
        characterId: actor.characterId,
        label,
        dice,
        results,
        total,
        isHiddenFromPlayers,
      }).catch((error: unknown) => console.error('Failed to submit roll', error))
      return { results, total }
    },
    [gameKey, actor.name, actor.role, actor.characterId],
  )
}
