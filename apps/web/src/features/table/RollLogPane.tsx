import type { DiceSpec, RollEvent } from '@orcisgate/domain'
import { DiceTray } from './DiceTray.js'

interface RollLogPaneProps {
  rollLog: RollEvent[]
  onRoll: (label: string, dice: DiceSpec[]) => void
}

function isLikelyCrit(roll: RollEvent): boolean {
  return roll.dice.some((d) => d.sides === 20) && roll.results.includes(20)
}

export function RollLogPane({ rollLog, onRoll }: RollLogPaneProps) {
  const recent = [...rollLog].reverse()

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-obsidian-700 bg-obsidian-900 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-moss-400">Roll Log</h2>
        <span className="rounded-full bg-obsidian-800 px-2 py-0.5 text-xs text-parchment-300">{rollLog.length}</span>
      </div>

      <ol className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
        {recent.map((roll) => (
          <li key={roll.id} className="rounded-lg border border-obsidian-700 bg-obsidian-800 p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-parchment-100">{roll.actorName}</span>
              <span className="text-xs text-parchment-300">{roll.dice.map((d) => `${d.count}d${d.sides}`).join('+')}</span>
            </div>
            <div className="text-xs text-parchment-300">{roll.label}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`text-xl font-semibold ${isLikelyCrit(roll) ? 'text-moss-300' : 'text-parchment-100'}`}>
                {roll.total}
              </span>
              <span className="text-xs text-parchment-300">({roll.results.join(' + ')})</span>
              {isLikelyCrit(roll) && (
                <span className="rounded bg-moss-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-moss-300">
                  Crit
                </span>
              )}
            </div>
          </li>
        ))}
        {recent.length === 0 && <li className="text-sm text-parchment-300">No rolls yet.</li>}
      </ol>

      <div className="mt-4 border-t border-obsidian-700 pt-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-parchment-300">Quick Dice</h3>
        <DiceTray onRoll={onRoll} />
      </div>
    </aside>
  )
}
