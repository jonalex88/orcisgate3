import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { useGameEvents } from '../../hooks/useGameEvents.js'
import { useRollSubmitter } from '../../hooks/useRollSubmitter.js'
import { exitEncounter, importEncounter, rollInitiative, setMoodImage } from '../../lib/api.js'
import { DmSettingsPanel } from './DmSettingsPanel.js'
import { InitiativePane } from './InitiativePane.js'
import { RollLogPane } from './RollLogPane.js'
import { SceneCarousel } from './SceneCarousel.js'
import { StatBlockPanel } from './StatBlockPanel.js'
import { TableTopBar } from './TableTopBar.js'

export function DmTableView() {
  const { gameKey = '' } = useParams<{ gameKey: string }>()
  const state = useGameEvents(gameKey, 'dm')
  const roll = useRollSubmitter(gameKey, { name: 'Dungeon Master', role: 'dm', characterId: null })

  const [selectedMonsterUniqueId, setSelectedMonsterUniqueId] = useState<string | null>(null)
  const [encounterJson, setEncounterJson] = useState('')
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    const firstMonster = state.activeEncounter?.monsters[0]
    if (firstMonster && !selectedMonsterUniqueId) {
      setSelectedMonsterUniqueId(firstMonster.uniqueId)
    }
    if (!state.activeEncounter) setSelectedMonsterUniqueId(null)
  }, [state.activeEncounter?.id])

  const selectedInstance = state.activeEncounter?.monsters.find((m) => m.uniqueId === selectedMonsterUniqueId)
  const selectedMonster = state.activeEncounterMonsters.find((m) => m.id === selectedInstance?.templateId) ?? null

  async function handleImportEncounter() {
    setImportStatus(null)
    try {
      const parsed: unknown = JSON.parse(encounterJson)
      const result = await importEncounter(gameKey, parsed)
      setImportStatus(
        result.missingMonsterIds.length > 0
          ? `Loaded, but missing stat blocks for monster id(s) ${result.missingMonsterIds.join(', ')} — paste them in DM Settings, then reload this encounter.`
          : null,
      )
      setEncounterJson('')
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : 'Could not import that encounter JSON.')
    }
  }

  return (
    <div className="flex h-screen flex-col bg-obsidian-950">
      <TableTopBar
        gameKey={gameKey}
        roleLabel="Dungeon Master's Table"
        roundNum={state.activeEncounter?.roundNum ?? null}
        connected={state.connected}
      />

      <div className="flex flex-1 overflow-hidden">
        <InitiativePane
          encounter={state.activeEncounter}
          selectedMonsterUniqueId={selectedMonsterUniqueId}
          onSelectMonster={setSelectedMonsterUniqueId}
        />

        <div className="flex flex-1 flex-col overflow-hidden">
          {state.activeEncounter ? (
            <>
              <div className="flex items-center justify-end gap-2 border-b border-obsidian-700 p-3">
                <button
                  type="button"
                  onClick={() => void rollInitiative(gameKey, state.activeEncounter!.id)}
                  className="rounded border border-obsidian-600 px-3 py-1.5 text-sm text-parchment-100 hover:bg-obsidian-800"
                >
                  Roll Initiative
                </button>
                <button
                  type="button"
                  onClick={() => void exitEncounter(gameKey, state.activeEncounter!.id)}
                  className="rounded border border-hp-500 px-3 py-1.5 text-sm text-hp-400 hover:bg-obsidian-800"
                >
                  Exit Encounter
                </button>
              </div>
              <StatBlockPanel monster={selectedMonster} onRollAction={(label) => roll(label, [{ sides: 20, count: 1 }])} />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
              <h2 className="text-lg font-semibold text-parchment-100">No active encounter</h2>
              <p className="max-w-md text-center text-sm text-parchment-300">
                Paste an encounter exported from D&D Beyond's Combat Tracker. Any monster it references
                that's already in the shared library resolves automatically.
              </p>
              <textarea
                className="h-40 w-full max-w-lg rounded border border-obsidian-700 bg-obsidian-900 p-2 font-mono text-xs text-parchment-100 outline-none focus:border-moss-500"
                value={encounterJson}
                onChange={(e) => setEncounterJson(e.target.value)}
                placeholder="Paste encounter JSON here"
              />
              <button
                type="button"
                onClick={() => void handleImportEncounter()}
                disabled={encounterJson.trim().length === 0}
                className="rounded bg-moss-500 px-4 py-2 text-sm font-medium text-obsidian-950 hover:bg-moss-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Load Encounter
              </button>
              {importStatus && <p className="max-w-lg text-center text-xs text-parchment-300">{importStatus}</p>}
            </div>
          )}
        </div>

        <RollLogPane rollLog={state.rollLog} onRoll={(label, dice) => roll(label, dice)} />
      </div>

      <SceneCarousel moodImageUrl={state.moodImageUrl} onSelect={(url) => void setMoodImage(gameKey, url)} />

      <div className="flex justify-end border-t border-obsidian-700 bg-obsidian-900 px-4 py-2">
        <button type="button" onClick={() => setSettingsOpen(true)} className="text-sm text-parchment-300 hover:text-moss-400">
          DM Settings
        </button>
      </div>

      {settingsOpen && (
        <DmSettingsPanel gameKey={gameKey} showDmRollsToPlayers={false} onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  )
}
