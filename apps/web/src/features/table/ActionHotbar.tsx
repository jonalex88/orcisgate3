import type { ActionItem, EconomyType } from '@orcisgate/domain'
import { useEffect, useState } from 'react'

const ECONOMY_BORDER: Record<EconomyType, string> = {
  action: 'border-moss-500',
  bonusAction: 'border-arcane-500',
  reaction: 'border-violet-500',
  legendaryAction: 'border-hp-500',
  freeAction: 'border-obsidian-600',
  uncategorized: 'border-obsidian-600',
}

const ECONOMY_LABEL: Record<EconomyType, string> = {
  action: 'Action',
  bonusAction: 'Bonus Action',
  reaction: 'Reaction',
  legendaryAction: 'Legendary Action',
  freeAction: 'Free Action',
  uncategorized: 'Other',
}

const HOTKEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

interface ActionHotbarProps {
  actions: ActionItem[]
  onRoll: (label: string) => void
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * The BG3-style hotbar this app's UI is built around — large numbered slots instead of the
 * mockup's flat icon row, since a real hotbar (with a detail popover instead of forcing an
 * assumption about what "clicking an action" should roll) generalizes to any ActionItem, whether
 * it's a player's pinned actions or a DM-selected monster's parsed actions.
 */
export function ActionHotbar({ actions, onRoll }: ActionHotbarProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const slots = actions.slice(0, 10)
  const selected = selectedIndex != null ? slots[selectedIndex] : undefined

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const index = HOTKEYS.indexOf(e.key)
      if (index === -1 || index >= slots.length) return
      setSelectedIndex((current) => (current === index ? null : index))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [slots.length])

  return (
    <div className="relative border-t border-obsidian-700 bg-obsidian-900 p-3">
      {selected && (
        <div className="absolute bottom-full left-1/2 mb-2 w-96 -translate-x-1/2 rounded-lg border border-obsidian-700 bg-obsidian-800 p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-parchment-100">{selected.name}</h4>
            <span className={`rounded border px-2 py-0.5 text-xs text-parchment-300 ${ECONOMY_BORDER[selected.economyType]}`}>
              {ECONOMY_LABEL[selected.economyType]}
            </span>
          </div>
          <p className="mt-2 max-h-40 overflow-y-auto text-sm text-parchment-300">{stripHtml(selected.description)}</p>
          <button
            type="button"
            className="mt-3 rounded bg-moss-500 px-3 py-1.5 text-sm font-medium text-obsidian-950 hover:bg-moss-400"
            onClick={() => onRoll(selected.name)}
          >
            Roll d20
          </button>
        </div>
      )}

      {slots.length === 0 ? (
        <p className="text-center text-sm text-parchment-300">No actions to show yet.</p>
      ) : (
        <div className="flex justify-center gap-2">
          {slots.map((action, index) => (
            <button
              key={action.id}
              type="button"
              onClick={() => setSelectedIndex((current) => (current === index ? null : index))}
              className={`relative flex h-16 w-16 flex-col items-center justify-center rounded-lg border-2 bg-obsidian-800 text-center hover:bg-obsidian-700 ${ECONOMY_BORDER[action.economyType]} ${selectedIndex === index ? 'ring-2 ring-moss-400' : ''}`}
              title={action.name}
            >
              <span className="absolute left-1 top-1 text-[10px] text-parchment-300">{HOTKEYS[index]}</span>
              <span className="line-clamp-2 px-1 text-[11px] leading-tight text-parchment-100">{action.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
