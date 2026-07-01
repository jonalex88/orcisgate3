import { useState } from 'react'
import { importMonsters, updateGameSettings } from '../../lib/api.js'

interface DmSettingsPanelProps {
  gameKey: string
  showDmRollsToPlayers: boolean
  onClose: () => void
}

export function DmSettingsPanel({ gameKey, showDmRollsToPlayers, onClose }: DmSettingsPanelProps) {
  const [showRolls, setShowRolls] = useState(showDmRollsToPlayers)
  const [monsterJson, setMonsterJson] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  async function toggleShowRolls(value: boolean) {
    setShowRolls(value)
    await updateGameSettings(gameKey, { showDmRollsToPlayers: value }).catch(() => undefined)
  }

  async function handleBulkImport() {
    setStatus(null)
    try {
      const parsed: unknown = JSON.parse(monsterJson)
      const result = await importMonsters(parsed)
      setStatus(`Imported ${result.imported.length} monster(s): ${result.imported.map((m) => m.name).join(', ')}`)
      setMonsterJson('')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not import that JSON.')
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-8">
      <div className="w-full max-w-lg rounded-lg border border-obsidian-700 bg-obsidian-800 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-parchment-100">DM Settings</h2>
          <button type="button" onClick={onClose} className="text-parchment-300 hover:text-parchment-100">
            ✕
          </button>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-parchment-300">
          <input
            type="checkbox"
            checked={showRolls}
            onChange={(e) => void toggleShowRolls(e.target.checked)}
            className="h-4 w-4 accent-moss-500"
          />
          Show my rolls to the underlings
        </label>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-moss-400">Bulk-import monster stat blocks</h3>
          <p className="mt-1 text-xs text-parchment-300">
            Paste a D&D Beyond monster-stats JSON payload (one monster or an array of many) to add them
            to the shared library — every game, forever, without pasting again.
          </p>
          <textarea
            className="mt-2 h-32 w-full rounded border border-obsidian-700 bg-obsidian-900 p-2 font-mono text-xs text-parchment-100 outline-none focus:border-moss-500"
            value={monsterJson}
            onChange={(e) => setMonsterJson(e.target.value)}
            placeholder="Paste monster stat-block JSON here"
          />
          <button
            type="button"
            onClick={() => void handleBulkImport()}
            disabled={monsterJson.trim().length === 0}
            className="mt-2 rounded bg-moss-500 px-3 py-1.5 text-sm font-medium text-obsidian-950 hover:bg-moss-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Import
          </button>
          {status && <p className="mt-2 text-xs text-parchment-300">{status}</p>}
        </div>
      </div>
    </div>
  )
}
