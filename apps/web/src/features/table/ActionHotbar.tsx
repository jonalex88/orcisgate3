import type { ActionItem, EconomyType, Spell } from '@orcisgate/domain'
import { useEffect, useMemo, useState } from 'react'

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

/**
 * Always-visible tabs, in turn order — a player should see these four categories exist even when
 * empty, so the hotbar teaches the action economy rather than only showing what happens to be
 * populated. `legendaryAction`/`uncategorized` are monster/leftover cases and only show up as tabs
 * when something actually lands in them (see `visibleTabs` below).
 */
const PRIMARY_ECONOMIES: EconomyType[] = ['action', 'bonusAction', 'reaction', 'freeAction']
const SECONDARY_ECONOMIES: EconomyType[] = ['legendaryAction', 'uncategorized']

const HOTKEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

type HotbarEntry = { kind: 'action'; action: ActionItem } | { kind: 'spell'; spell: Spell }

interface ActionHotbarProps {
  actions: ActionItem[]
  /** Omitted for monsters (their spell-like effects are already folded into `actions`). */
  spells?: Spell[]
  onRoll: (label: string) => void
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function entryDetail(entry: HotbarEntry): { name: string; description: string; meta: string; tags: string[] } {
  if (entry.kind === 'action') {
    return {
      name: entry.action.name,
      description: entry.action.description,
      meta: ECONOMY_LABEL[entry.action.economyType],
      tags: entry.action.tags,
    }
  }
  const spell = entry.spell
  const tags = [
    spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`,
    spell.school,
    spell.range,
    spell.concentration ? 'Concentration' : null,
    spell.ritual ? 'Ritual' : null,
  ].filter((tag): tag is string => tag != null)
  return { name: spell.name, description: spell.description, meta: 'Spell', tags }
}

/**
 * Grouped by action economy (Action / Bonus Action / Reaction / Free Action) rather than one flat
 * row — picking a category surfaces only what's actually usable in it, split into Attacks/Spells/
 * Other, same shape as how a player actually thinks through their turn. A literal radial (PS5-style)
 * layout was considered and explicitly deprioritized in favor of getting this grouping right first.
 */
export function ActionHotbar({ actions, spells = [], onRoll }: ActionHotbarProps) {
  const grouped = useMemo(() => {
    const map = new Map<EconomyType, { weapons: ActionItem[]; other: ActionItem[]; spells: Spell[] }>()
    for (const economy of [...PRIMARY_ECONOMIES, ...SECONDARY_ECONOMIES]) {
      map.set(economy, {
        weapons: actions.filter((a) => a.economyType === economy && a.sourceKind === 'weapon'),
        other: actions.filter((a) => a.economyType === economy && a.sourceKind !== 'weapon'),
        spells: spells.filter((s) => s.castingEconomy === economy),
      })
    }
    return map
  }, [actions, spells])

  const countFor = (economy: EconomyType) => {
    const g = grouped.get(economy)
    return g ? g.weapons.length + g.other.length + g.spells.length : 0
  }

  const visibleTabs = [...PRIMARY_ECONOMIES, ...SECONDARY_ECONOMIES.filter((e) => countFor(e) > 0)]

  const [activeEconomy, setActiveEconomy] = useState<EconomyType>(
    () => PRIMARY_ECONOMIES.find((e) => countFor(e) > 0) ?? 'action',
  )
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  function selectEconomy(economy: EconomyType) {
    setActiveEconomy(economy)
    setSelectedIndex(null)
  }

  const activeGroup = grouped.get(activeEconomy) ?? { weapons: [], other: [], spells: [] }

  // Capped at 10 total (one per hotkey) — sliced per-section in order (weapons, spells, other) so
  // the rendered groups below and the hotkey-indexed flatEntries never disagree about what's shown.
  let slotsRemaining = 10
  function takeUpTo<T>(items: T[]): T[] {
    const taken = items.slice(0, slotsRemaining)
    slotsRemaining -= taken.length
    return taken
  }
  const weaponEntries: HotbarEntry[] = takeUpTo(activeGroup.weapons).map((action) => ({ kind: 'action', action }))
  const spellEntries: HotbarEntry[] = takeUpTo(activeGroup.spells).map((spell) => ({ kind: 'spell', spell }))
  const otherEntries: HotbarEntry[] = takeUpTo(activeGroup.other).map((action) => ({ kind: 'action', action }))
  const flatEntries: HotbarEntry[] = [...weaponEntries, ...spellEntries, ...otherEntries]

  const selected = selectedIndex != null ? flatEntries[selectedIndex] : undefined
  const selectedDetail = selected ? entryDetail(selected) : undefined
  const selectedBorder =
    selected?.kind === 'action' ? ECONOMY_BORDER[selected.action.economyType] : ECONOMY_BORDER[activeEconomy]

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const index = HOTKEYS.indexOf(e.key)
      if (index === -1 || index >= flatEntries.length) return
      setSelectedIndex((current) => (current === index ? null : index))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [flatEntries.length])

  let hotkeyCursor = 0
  function renderSlotGroup(label: string, entries: HotbarEntry[]) {
    if (entries.length === 0) return null
    const startIndex = hotkeyCursor
    hotkeyCursor += entries.length
    return (
      <div key={label} className="flex flex-col items-center gap-1">
        <span className="text-[10px] uppercase tracking-wide text-parchment-300">{label}</span>
        <div className="flex gap-2">
          {entries.map((entry, offset) => {
            const index = startIndex + offset
            const detail = entryDetail(entry)
            const border = entry.kind === 'action' ? ECONOMY_BORDER[entry.action.economyType] : ECONOMY_BORDER[activeEconomy]
            const key = entry.kind === 'action' ? entry.action.id : entry.spell.id
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedIndex((current) => (current === index ? null : index))}
                className={`relative flex h-16 w-16 flex-col items-center justify-center rounded-lg border-2 bg-obsidian-800 text-center hover:bg-obsidian-700 ${border} ${selectedIndex === index ? 'ring-2 ring-moss-400' : ''}`}
                title={detail.name}
              >
                <span className="absolute left-1 top-1 text-[10px] text-parchment-300">{HOTKEYS[index]}</span>
                <span className="line-clamp-2 px-1 text-[11px] leading-tight text-parchment-100">{detail.name}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="relative border-t border-obsidian-700 bg-obsidian-900 p-3">
      {selected && selectedDetail && (
        <div className="absolute bottom-full left-1/2 mb-2 w-96 -translate-x-1/2 rounded-lg border border-obsidian-700 bg-obsidian-800 p-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-parchment-100">{selectedDetail.name}</h4>
            <span className={`rounded border px-2 py-0.5 text-xs text-parchment-300 ${selectedBorder}`}>
              {selectedDetail.meta}
            </span>
          </div>
          {selectedDetail.tags.length > 0 && (
            <p className="mt-1 text-xs text-moss-400">{selectedDetail.tags.join(' · ')}</p>
          )}
          <p className="mt-2 max-h-40 overflow-y-auto text-sm text-parchment-300">
            {stripHtml(selectedDetail.description)}
          </p>
          <button
            type="button"
            className="mt-3 rounded bg-moss-500 px-3 py-1.5 text-sm font-medium text-obsidian-950 hover:bg-moss-400"
            onClick={() => onRoll(selectedDetail.name)}
          >
            Roll d20
          </button>
        </div>
      )}

      <div className="mb-3 flex justify-center gap-2">
        {visibleTabs.map((economy) => (
          <button
            key={economy}
            type="button"
            onClick={() => selectEconomy(economy)}
            className={`rounded border px-3 py-1 text-xs font-medium ${
              activeEconomy === economy
                ? 'border-moss-400 bg-obsidian-800 text-parchment-100'
                : 'border-obsidian-700 text-parchment-300 hover:bg-obsidian-800'
            }`}
          >
            {ECONOMY_LABEL[economy]} <span className="text-parchment-400">({countFor(economy)})</span>
          </button>
        ))}
      </div>

      {flatEntries.length === 0 ? (
        <p className="text-center text-sm text-parchment-300">
          No {ECONOMY_LABEL[activeEconomy].toLowerCase()} options to show yet.
        </p>
      ) : (
        <div className="flex flex-wrap justify-center gap-6">
          {renderSlotGroup('Attacks', weaponEntries)}
          {renderSlotGroup('Spells', spellEntries)}
          {renderSlotGroup('Other', otherEntries)}
        </div>
      )}
    </div>
  )
}
