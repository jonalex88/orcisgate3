import type { Character } from '@orcisgate/domain'
import type { ReactNode } from 'react'

interface CharacterSummaryProps {
  character: Character
}

/**
 * The player's action-economy dashboard, embedded in the shared table layout. Still fairly plain
 * list-based sections for spells/features/resources — the BG3-card treatment is fully applied to
 * the action hotbar (the actually-clickable combat surface); a deeper visual pass on these
 * secondary reference sections is a natural next iteration, not attempted in this pass.
 */
export function CharacterSummary({ character }: CharacterSummaryProps) {
  return (
    <div className="text-parchment-100">
      <h1 className="text-3xl font-semibold">{character.name}</h1>
      <p className="text-parchment-300">
        {character.classes.map((c) => `${c.name}${c.subclass ? ` (${c.subclass})` : ''} ${c.level}`).join(' / ')}
        {' · Level '}
        {character.level}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="HP" value={String(character.maxHp)} />
        <Stat label="Armor Class" value={String(character.armorClass)} />
        <Stat label="Speed" value={`${character.speed} ft`} />
        <Stat label="Proficiency" value={`+${character.proficiencyBonus}`} />
      </div>

      <Section title={`Spells (${character.spells.length})`}>
        {character.spells.map((s) => (
          <li key={s.id}>
            <span className="text-parchment-100">{s.name}</span>{' '}
            <span className="text-parchment-300">
              — level {s.level} · {s.castingEconomy}
              {s.concentration ? ' · concentration' : ''}
            </span>
          </li>
        ))}
      </Section>

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
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-obsidian-700 bg-obsidian-800 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-parchment-300">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold text-moss-400">{title}</h2>
      <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-obsidian-700 bg-obsidian-800 p-3 text-sm">
        {children}
      </ul>
    </section>
  )
}
