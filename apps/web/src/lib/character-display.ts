import type { Character } from '@orcisgate/domain'

/** e.g. "Warlock 1 / Cleric (Twilight Domain) 3" — shared between CharacterSummary and the roster announce. */
export function classByLine(character: Character): string {
  return character.classes
    .map((c) => `${c.name}${c.subclass ? ` (${c.subclass})` : ''} ${c.level}`)
    .join(' / ')
}
