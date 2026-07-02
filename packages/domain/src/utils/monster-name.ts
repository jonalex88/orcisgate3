const COMBINING_DIACRITICS_PATTERN = new RegExp('[\\u0300-\\u036f]', 'g')

/**
 * Normalizes a monster name for fuzzy matching across data sources that don't share D&D Beyond's
 * numeric monster ids (e.g. an open compendium seeded ahead of time — see the encounter-import
 * name-fallback in apps/server). Deliberately approximate, not a guarantee of the same monster:
 * - Strips a trailing disambiguation suffix D&D Beyond adds to encounter instances, e.g.
 *   "Bandit (A)" -> "bandit" — without this, every instance of the same monster type would
 *   normalize to a different string and never match anything.
 * - A DM-renamed instance (e.g. "Grunk the Bandit") won't normalize to anything a real "Bandit"
 *   template matches — accepted gap, not something this function tries to solve.
 * - Spelling variants across sources (e.g. "Gray Ooze" vs "Grey Ooze") won't match either.
 */
export function normalizeMonsterName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)\s*$/, '')
    .normalize('NFKD')
    .replace(COMBINING_DIACRITICS_PATTERN, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
