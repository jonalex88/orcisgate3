import { LiveProxyDataSource, mapCharacter, type Character } from '@orcisgate/domain'
import { useEffect, useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router'
import { useGameEvents } from '../../hooks/useGameEvents.js'
import { useRollSubmitter } from '../../hooks/useRollSubmitter.js'
import { ActionHotbar } from './ActionHotbar.js'
import { CharacterSummary } from './CharacterSummary.js'
import { MoodImageDisplay } from './MoodImageDisplay.js'
import { RollLogPane } from './RollLogPane.js'
import { TableTopBar } from './TableTopBar.js'

const dataSource = new LiveProxyDataSource()

export function PlayerTableView() {
  const { gameKey = '' } = useParams<{ gameKey: string }>()
  const [searchParams] = useSearchParams()
  const characterId = searchParams.get('characterId') ?? ''

  const [character, setCharacter] = useState<Character | null>(null)
  const [error, setError] = useState<string | null>(null)
  const state = useGameEvents(gameKey, 'player')
  const roll = useRollSubmitter(gameKey, {
    name: character?.name ?? 'Player',
    role: 'player',
    characterId: characterId || null,
  })

  useEffect(() => {
    if (!characterId) return
    dataSource
      .fetchCharacter({ characterId })
      .then((raw) => setCharacter(mapCharacter(raw.data)))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load character'))
  }, [characterId])

  if (!characterId) return <Navigate to={`/game/${encodeURIComponent(gameKey)}/connect`} replace />

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian-950 p-8 text-hp-400">{error}</div>
    )
  }

  if (!character) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-obsidian-950 p-8 text-parchment-300">
        Connecting…
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-obsidian-950">
      <TableTopBar
        gameKey={gameKey}
        roleLabel={character.name}
        roundNum={state.activeEncounter?.roundNum ?? null}
        connected={state.connected}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <MoodImageDisplay url={state.moodImageUrl} />
          <CharacterSummary character={character} />
        </div>
        <RollLogPane rollLog={state.rollLog} onRoll={(label, dice) => roll(label, dice)} />
      </div>

      <ActionHotbar actions={character.actions} onRoll={(label) => roll(label, [{ sides: 20, count: 1 }])} />
    </div>
  )
}
