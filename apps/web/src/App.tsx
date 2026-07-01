import { LiveProxyDataSource, mapCharacter, parseCharacterId, type Character } from '@orcisgate/domain'
import { useEffect, useState } from 'react'
import { CharacterDebugView } from './features/character/CharacterDebugView.js'
import { ConnectScreen } from './features/connect/ConnectScreen.js'
import { getLastCharacterId, setLastCharacterId } from './lib/cookies.js'

const dataSource = new LiveProxyDataSource()

export default function App() {
  const [character, setCharacter] = useState<Character | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCharacterId, setLastCharacterIdState] = useState('')

  useEffect(() => {
    const remembered = getLastCharacterId()
    if (remembered) {
      setLastCharacterIdState(remembered)
      void connect(remembered)
    }
  }, [])

  async function connect(input: string) {
    const characterId = parseCharacterId(input)
    if (!characterId) {
      setError('That does not look like a D&D Beyond character URL or id.')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const raw = await dataSource.fetchCharacter({ characterId })
      setCharacter(mapCharacter(raw.data))
      setLastCharacterId(characterId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong connecting to that character.')
    } finally {
      setIsLoading(false)
    }
  }

  if (character) {
    return <CharacterDebugView character={character} onDisconnect={() => setCharacter(null)} />
  }

  return (
    <ConnectScreen
      initialValue={lastCharacterId}
      onConnect={(input) => void connect(input)}
      isLoading={isLoading}
      error={error}
    />
  )
}
