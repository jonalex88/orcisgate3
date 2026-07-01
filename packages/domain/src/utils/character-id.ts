/**
 * Accepts either a bare character id ("167672386") or a full D&D Beyond character URL
 * ("https://www.dndbeyond.com/characters/167672386-nathaniel-twinty") and returns the numeric id,
 * or null if it can't find one. This is the one thing a user has to paste in to "connect" —
 * per the app's design, that id doubles as the storage key everywhere (character cache, and
 * later, stored connection credentials), so getting this parse right matters.
 */
export function parseCharacterId(input: string): string | null {
  const trimmed = input.trim()
  if (/^\d+$/.test(trimmed)) return trimmed

  const match = trimmed.match(/dndbeyond\.com\/characters?\/(\d+)/i)
  return match?.[1] ?? null
}
