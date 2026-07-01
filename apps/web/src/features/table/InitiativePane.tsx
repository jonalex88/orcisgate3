import type { Encounter } from '@orcisgate/domain'

interface Combatant {
  key: string
  name: string
  subtitle: string
  initiative: number | null
  currentHp: number | null
  maxHp: number | null
  isMonster: boolean
  monsterUniqueId: string | null
}

interface InitiativePaneProps {
  encounter: Encounter | null
  selectedMonsterUniqueId?: string | null
  onSelectMonster?: (uniqueId: string) => void
}

function toCombatants(encounter: Encounter): Combatant[] {
  const monsters: Combatant[] = encounter.monsters.map((m) => ({
    key: `monster-${m.uniqueId}`,
    name: m.label,
    subtitle: 'Monster',
    initiative: m.initiative,
    currentHp: m.currentHp,
    maxHp: m.maxHp,
    isMonster: true,
    monsterUniqueId: m.uniqueId,
  }))
  const players: Combatant[] = encounter.players.map((p) => ({
    key: `player-${p.characterId}`,
    name: p.name,
    subtitle: p.classByLine,
    initiative: p.initiative,
    currentHp: null,
    maxHp: null,
    isMonster: false,
    monsterUniqueId: null,
  }))
  return [...monsters, ...players].sort((a, b) => (b.initiative ?? -1) - (a.initiative ?? -1))
}

export function InitiativePane({ encounter, selectedMonsterUniqueId, onSelectMonster }: InitiativePaneProps) {
  const combatants = encounter ? toCombatants(encounter) : []

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-obsidian-700 bg-obsidian-900 p-4">
      <h2 className="text-sm font-semibold tracking-wide text-moss-400">Initiative</h2>

      {!encounter && <p className="mt-4 text-sm text-parchment-300">No active encounter.</p>}

      <ol className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
        {combatants.map((c) => {
          const hpPct = c.maxHp ? Math.max(0, Math.min(100, (c.currentHp! / c.maxHp) * 100)) : null
          const isSelected = c.isMonster && c.monsterUniqueId === selectedMonsterUniqueId
          return (
            <li key={c.key}>
              <button
                type="button"
                disabled={!c.isMonster}
                onClick={() => c.monsterUniqueId && onSelectMonster?.(c.monsterUniqueId)}
                className={`w-full rounded-lg border p-3 text-left ${
                  isSelected ? 'border-moss-500 bg-obsidian-800' : 'border-obsidian-700 bg-obsidian-800/60'
                } ${c.isMonster ? 'hover:border-moss-500' : 'cursor-default'}`}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-obsidian-600 text-sm font-semibold text-parchment-100">
                    {c.initiative ?? '–'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-parchment-100">{c.name}</div>
                    <div className="truncate text-xs text-parchment-300">{c.subtitle}</div>
                  </div>
                </div>
                {hpPct != null && (
                  <div className="mt-2">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-obsidian-700">
                      <div className="h-full bg-moss-500" style={{ width: `${hpPct}%` }} />
                    </div>
                    <div className="mt-0.5 text-[10px] text-parchment-300">
                      {c.currentHp}/{c.maxHp} HP
                    </div>
                  </div>
                )}
              </button>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
