import { parseCharacterId } from '@orcisgate/domain'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ConnectScreen } from '../connect/ConnectScreen.js'
import { getLastCharacterId, setLastCharacterId } from '../../lib/cookies.js'

/**
 * Validates and remembers the character id, then hands off to PlayerTableView, which does the
 * actual live fetch — keeping "does this look like a character?" (instant, local) separate from
 * "can we actually reach D&D Beyond for it?" (the real connect, with its own error state).
 */
export function PlayerConnectRoute() {
  const { gameKey = '' } = useParams<{ gameKey: string }>()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  function handleConnect(input: string) {
    const characterId = parseCharacterId(input)
    if (!characterId) {
      setError('That does not look like a D&D Beyond character URL or id.')
      return
    }
    setLastCharacterId(characterId)
    navigate(`/game/${encodeURIComponent(gameKey)}/player?characterId=${encodeURIComponent(characterId)}`)
  }

  return (
    <ConnectScreen initialValue={getLastCharacterId() ?? ''} onConnect={handleConnect} isLoading={false} error={error} />
  )
}
