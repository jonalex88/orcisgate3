import type { ClassLevel } from '../models/character.js'

/**
 * Official D&D 5e multiclass spellcaster slot table (PHB "Spell Slots per Spell Level" by
 * combined caster level; unchanged between the 2014 and 2024 rules). Warlock's Pact Magic is
 * explicitly excluded from this table and tracked separately — see PACT_MAGIC_TABLE below.
 * Index 0 = unused; index N = slots available at spell level N for a given caster level.
 */
const MULTICLASS_SLOT_TABLE: readonly (readonly number[])[] = [
  [], // caster level 0 (no spellcasting classes)
  [0, 2, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 3, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 4, 2, 0, 0, 0, 0, 0, 0, 0],
  [0, 4, 3, 0, 0, 0, 0, 0, 0, 0],
  [0, 4, 3, 2, 0, 0, 0, 0, 0, 0],
  [0, 4, 3, 3, 0, 0, 0, 0, 0, 0],
  [0, 4, 3, 3, 1, 0, 0, 0, 0, 0],
  [0, 4, 3, 3, 2, 0, 0, 0, 0, 0],
  [0, 4, 3, 3, 3, 1, 0, 0, 0, 0],
  [0, 4, 3, 3, 3, 2, 0, 0, 0, 0],
  [0, 4, 3, 3, 3, 2, 1, 0, 0, 0],
  [0, 4, 3, 3, 3, 2, 1, 0, 0, 0],
  [0, 4, 3, 3, 3, 2, 1, 1, 0, 0],
  [0, 4, 3, 3, 3, 2, 1, 1, 0, 0],
  [0, 4, 3, 3, 3, 2, 1, 1, 1, 0],
  [0, 4, 3, 3, 3, 2, 1, 1, 1, 0],
  [0, 4, 3, 3, 3, 2, 1, 1, 1, 1],
  [0, 4, 3, 3, 3, 3, 1, 1, 1, 1],
  [0, 4, 3, 3, 3, 3, 2, 1, 1, 1],
  [0, 4, 3, 3, 3, 3, 2, 2, 1, 1],
]

/** Warlock Pact Magic: always a single slot level, 2 slots from level 2 on. */
const PACT_MAGIC_TABLE: readonly { slotLevel: number; slots: number }[] = [
  { slotLevel: 1, slots: 1 }, // level 1
  { slotLevel: 1, slots: 2 }, // level 2
  { slotLevel: 2, slots: 2 }, // level 3
  { slotLevel: 2, slots: 2 }, // level 4
  { slotLevel: 3, slots: 2 }, // level 5
  { slotLevel: 3, slots: 2 }, // level 6
  { slotLevel: 4, slots: 2 }, // level 7
  { slotLevel: 4, slots: 2 }, // level 8
  { slotLevel: 5, slots: 2 }, // level 9
  { slotLevel: 5, slots: 2 }, // level 10
  { slotLevel: 5, slots: 3 }, // level 11
  { slotLevel: 5, slots: 3 }, // level 12
  { slotLevel: 5, slots: 3 }, // level 13
  { slotLevel: 5, slots: 3 }, // level 14
  { slotLevel: 5, slots: 3 }, // level 15
  { slotLevel: 5, slots: 3 }, // level 16
  { slotLevel: 5, slots: 4 }, // level 17
  { slotLevel: 5, slots: 4 }, // level 18
  { slotLevel: 5, slots: 4 }, // level 19
  { slotLevel: 5, slots: 4 }, // level 20
]

const FULL_CASTERS = new Set(['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard'])
const HALF_CASTERS_ROUND_DOWN = new Set(['Paladin', 'Ranger'])
/** Errata: Artificer is a half caster but rounds up, unlike Paladin/Ranger. */
const HALF_CASTERS_ROUND_UP = new Set(['Artificer'])
const THIRD_CASTER_SUBCLASSES = new Set(['Eldritch Knight', 'Arcane Trickster'])

function casterLevelContribution(classLevel: ClassLevel): number {
  if (FULL_CASTERS.has(classLevel.name)) return classLevel.level
  if (HALF_CASTERS_ROUND_DOWN.has(classLevel.name)) return Math.floor(classLevel.level / 2)
  if (HALF_CASTERS_ROUND_UP.has(classLevel.name)) return Math.ceil(classLevel.level / 2)
  if (classLevel.subclass && THIRD_CASTER_SUBCLASSES.has(classLevel.subclass)) {
    return Math.floor(classLevel.level / 3)
  }
  return 0
}

/** Combined multiclass caster level, per the PHB rule (Warlock excluded — it never contributes). */
export function multiclassCasterLevel(classes: ClassLevel[]): number {
  return classes.reduce((sum, c) => sum + casterLevelContribution(c), 0)
}

/** Max slots per spell level (index 1-9) for this character's non-Warlock spellcasting classes. */
export function multiclassSlotsBySpellLevel(classes: ClassLevel[]): readonly number[] {
  const casterLevel = Math.min(multiclassCasterLevel(classes), MULTICLASS_SLOT_TABLE.length - 1)
  return MULTICLASS_SLOT_TABLE[casterLevel] ?? []
}

/** This character's Pact Magic slot level and count, or null if they have no Warlock levels. */
export function pactMagicSlots(classes: ClassLevel[]): { slotLevel: number; slots: number } | null {
  const warlockLevel = classes.find((c) => c.name === 'Warlock')?.level
  if (!warlockLevel) return null
  const entry = PACT_MAGIC_TABLE[Math.min(warlockLevel, PACT_MAGIC_TABLE.length) - 1]
  return entry ?? null
}
