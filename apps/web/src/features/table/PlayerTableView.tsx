import { LiveProxyDataSource, mapCharacter, parseCharacterId, type Character } from '@orcisgate/domain'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { useGameEvents, type PlayerConnectionInfo } from '../../hooks/useGameEvents.js'
import { useRollSubmitter } from '../../hooks/useRollSubmitter.js'
import { classByLine } from '../../lib/character-display.js'
import { setLastCharacterId } from '../../lib/cookies.js'
import { ConnectScreen } from '../connect/ConnectScreen.js'
import { ActionHotbar } from './ActionHotbar.js'
import { CharacterSummary } from './CharacterSummary.js'
import { MoodImageDisplay } from './MoodImageDisplay.js'
import { RollLogPane } from './RollLogPane.js'
import { TableTopBar } from './TableTopBar.js'

const dataSource = new LiveProxyDataSource()

export function PlayerTableView() {
  const { gameKey = '' } = useParams<{ gameKey: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const characterId = searchParams.get('characterId') ?? ''

  const [character, setCharacter] = useState<Character | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Connecting announces "this player is at the table" (see useGameEvents) — held back until the
  // character has actually loaded so the roster shows a real name, not a placeholder.
  const playerInfo: PlayerConnectionInfo | undefined = useMemo(
    () =>
      character
        ? { characterId, name: character.name, classByLine: classByLine(character), avatarUrl: character.avatarUrl }
        : undefined,
    [character, characterId],
  )
  const state = useGameEvents(gameKey, 'player', playerInfo)
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
      <ConnectScreen
        initialValue={characterId}
        error={error}
        isLoading={false}
        onConnect={(input) => {
          const newCharacterId = parseCharacterId(input)
          if (!newCharacterId) return
          setLastCharacterId(newCharacterId)
          setError(null)
          navigate(`/game/${encodeURIComponent(gameKey)}/player?characterId=${encodeURIComponent(newCharacterId)}`)
        }}
      />
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

      <MoodImageDisplay url={state.moodImageUrl} compact />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <CharacterSummary character={character} />
        </div>
        <RollLogPane rollLog={state.rollLog} onRoll={(label, dice) => roll(label, dice)} />
      </div>

      <ActionHotbar
        actions={character.actions}
        spells={character.spells}
        onRoll={(label) => roll(label, [{ sides: 20, count: 1 }])}
      />
    </div>
  )
}
