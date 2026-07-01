import type { DiceSpec } from '@orcisgate/domain'
import { useState } from 'react'

const DIE_FACES = [4, 6, 8, 10, 12, 20, 100]

interface DiceTrayProps {
  onRoll: (label: string, dice: DiceSpec[]) => void
}

/**
 * Per the spec: click a die face to queue N of that die, click Roll to resolve everything queued
 * at once — not an immediate single-click roll (that's the mockup's "Quick Dice" visual, but the
 * written spec explicitly wants the queue-then-roll flow, which takes priority).
 */
export function DiceTray({ onRoll }: DiceTrayProps) {
  const [queue, setQueue] = useState<Record<number, number>>({})

  const totalQueued = Object.values(queue).reduce((sum, n) => sum + n, 0)

  function addDie(sides: number) {
    setQueue((q) => ({ ...q, [sides]: (q[sides] ?? 0) + 1 }))
  }

  function clear() {
    setQueue({})
  }

  function roll() {
    const dice: DiceSpec[] = Object.entries(queue).map(([sides, count]) => ({ sides: Number(sides), count }))
    if (dice.length === 0) return
    const label = dice.map((d) => `${d.count}d${d.sides}`).join(' + ')
    onRoll(label, dice)
    clear()
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {DIE_FACES.map((sides) => (
          <button
            key={sides}
            type="button"
            onClick={() => addDie(sides)}
            className="rounded border border-obsidian-600 bg-obsidian-900 py-2 text-sm font-medium text-parchment-100 hover:border-moss-500 hover:text-moss-300"
          >
            d{sides}
            {queue[sides] ? <span className="text-moss-400"> ×{queue[sides]}</span> : null}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={roll}
          disabled={totalQueued === 0}
          className="flex-1 rounded bg-moss-500 py-1.5 text-sm font-medium text-obsidian-950 hover:bg-moss-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Roll {totalQueued > 0 ? `(${totalQueued})` : ''}
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={totalQueued === 0}
          className="rounded border border-obsidian-600 px-3 py-1.5 text-sm text-parchment-300 hover:bg-obsidian-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
