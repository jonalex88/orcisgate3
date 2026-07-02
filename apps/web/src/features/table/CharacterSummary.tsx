import type { Character } from '@orcisgate/domain'
import type { ReactNode } from 'react'
import { classByLine } from '../../lib/character-display.js'

interface CharacterSummaryProps {
  character: Character
}

/**
 * Reference info only, not the combat surface — spells/actions are rollable from the hotbar
 * below, not repeated here. Laid out in 3 columns so it reads at a glance without much scrolling,
 * leaving the mood banner above visible rather than pushed off-screen by a tall single column.
 */
export function CharacterSummary({ character }: CharacterSummaryProps) {
  return (
    <div className="text-parchment-100">
      <div className="flex items-baseline gap-2">
        <h1 className="text-xl font-semibold">{character.name}</h1>
        <p className="text-sm text-parchment-300">
          {classByLine(character)} · Level {character.level}
        </p>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2">
        <Stat label="HP" value={String(character.maxHp)} />
        <Stat label="AC" value={String(character.armorClass)} />
        <Stat label="Speed" value={`${character.speed} ft`} />
        <Stat label="Prof." value={`+${character.proficiencyBonus}`} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Section title="Spell Slots">
          {character.spellSlots.map((slot) => (
            <li key={slot.level}>
              Level {slot.level}: {slot.current}/{slot.max}
            </li>
          ))}
        </Section>

        <Section title="Resources">
          {character.resources.map((r) => (
            <li key={r.id}>
              {r.name}: {r.current}/{r.max} ({r.resetsOn})
            </li>
          ))}
        </Section>

        <Section title={`Features (${character.features.length})`}>
          {character.features.map((f) => (
            <li key={f.id}>
              <span className="text-parchment-100">{f.name}</span>{' '}
              <span className="text-parchment-300">{f.isPassive ? '(passive)' : '(active)'}</span>
            </li>
          ))}
        </Section>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-obsidian-700 bg-obsidian-800 px-2 py-1">
      <div className="text-[10px] uppercase tracking-wide text-parchment-300">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-moss-400">{title}</h2>
      <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto rounded border border-obsidian-700 bg-obsidian-800 p-2 text-xs">
        {children}
      </ul>
    </section>
  )
}
