import { abilityModifier, type AbilityName, type MonsterTemplate } from '@orcisgate/domain'
import { ActionHotbar } from './ActionHotbar.js'

const ABILITY_ABBREVIATION: Record<AbilityName, string> = {
  strength: 'STR',
  dexterity: 'DEX',
  constitution: 'CON',
  intelligence: 'INT',
  wisdom: 'WIS',
  charisma: 'CHA',
}

interface StatBlockPanelProps {
  monster: MonsterTemplate | null
  onRollAction: (label: string) => void
}

/**
 * Deliberately doesn't show alignment/size/type/challenge rating — D&D Beyond references those
 * via lookup tables (alignmentId, sizeId, typeId, challengeRatingId) this app doesn't have a
 * confirmed mapping for (see packages/domain/README.md). Showing a guessed value would be worse
 * than not showing one.
 */
export function StatBlockPanel({ monster, onRollAction }: StatBlockPanelProps) {
  if (!monster) {
    return (
      <div className="flex flex-1 items-center justify-center text-parchment-300">
        Select a monster from the initiative pane to see its stat block.
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="text-3xl font-semibold tracking-wide text-parchment-100">{monster.name}</h1>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <StatCard label="Armor Class" value={String(monster.armorClass)} sub={monster.armorClassDescription} />
          <StatCard label="Hit Points" value={String(monster.averageHitPoints)} sub={monster.hitPointDice.diceString} />
          <StatCard label="Speed" value={`${monster.speed} ft`} />
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {(Object.entries(monster.abilityScores) as [AbilityName, number][]).map(([ability, score]) => (
            <div key={ability} className="rounded-lg border border-obsidian-700 bg-obsidian-800 p-3 text-center">
              <div className="text-xs uppercase tracking-wide text-parchment-300">{ABILITY_ABBREVIATION[ability]}</div>
              <div className="text-xl font-semibold text-parchment-100">{score}</div>
              <div className="text-xs text-moss-400">
                {abilityModifier(score) >= 0 ? '+' : ''}
                {abilityModifier(score)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ActionHotbar actions={monster.actions} onRoll={onRollAction} />
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-obsidian-700 bg-obsidian-800 p-4">
      <div className="text-xs uppercase tracking-wide text-parchment-300">{label}</div>
      <div className="text-2xl font-semibold text-parchment-100">{value}</div>
      {sub && <div className="text-xs text-parchment-300">{sub}</div>}
    </div>
  )
}
