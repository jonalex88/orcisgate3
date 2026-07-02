import { LiveProxyDataSource, mapCharacter, parseCharacterId, type Character } from '@orcisgate/domain'
import { useState } from 'react'

const dataSource = new LiveProxyDataSource()

interface PlayerSettingsPanelProps {
  characterId: string
  onCharacterUpdated: (character: Character, characterId: string) => void
  onClose: () => void
}

/**
 * Re-fetches the character from D&D Beyond (bypassing the server's cache — see
 * apps/server/src/routes/characters.ts's `?refresh=true`) so edits made on the sheet since
 * connecting (new inventory, a leveled-up spell list, etc.) show up without leaving the table.
 */
export function PlayerSettingsPanel({ characterId, onCharacterUpdated, onClose }: PlayerSettingsPanelProps) {
  const [value, setValue] = useState(characterId)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const isValid = parseCharacterId(value) !== null

  async function handleReimport() {
    const newCharacterId = parseCharacterId(value)
    if (!newCharacterId) return

    setIsLoading(true)
    setStatus(null)
    try {
      const raw = await dataSource.fetchCharacter({ characterId: newCharacterId, forceRefresh: true })
      const character = mapCharacter(raw.data)
      onCharacterUpdated(character, newCharacterId)
      setStatus(`Re-imported ${character.name} — sheet changes are now up to date.`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not re-import that character.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-8">
      <div className="w-full max-w-lg rounded-lg border border-obsidian-700 bg-obsidian-800 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-parchment-100">Player Settings</h2>
          <button type="button" onClick={onClose} className="text-parchment-300 hover:text-parchment-100">
            ✕
          </button>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-moss-400">Re-import your character</h3>
          <p className="mt-1 text-xs text-parchment-300">
            Changed something on your D&D Beyond sheet — new inventory, a level up, a swapped spell? Paste
            the character URL or id again to pull the latest version into this table.
          </p>
          <input
            className="mt-2 w-full rounded border border-obsidian-700 bg-obsidian-900 px-3 py-2 text-parchment-100 outline-none focus:border-moss-500"
            placeholder="https://www.dndbeyond.com/characters/167672386"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => void handleReimport()}
            disabled={isLoading || !isValid}
            className="mt-2 rounded bg-moss-500 px-3 py-1.5 text-sm font-medium text-obsidian-950 hover:bg-moss-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading ? 'Re-importing…' : 'Re-import'}
          </button>
          {status && <p className="mt-2 text-xs text-parchment-300">{status}</p>}
        </div>
      </div>
    </div>
  )
}
