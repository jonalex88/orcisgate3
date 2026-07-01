/**
 * Plain client-side cookie, not tied to any server session — just remembers the last character
 * id this browser connected to, so returning doesn't require re-pasting the character URL. Not
 * httpOnly since only this app's own JS ever needs to read it, and it holds no secret (a D&D
 * Beyond character id is not sensitive).
 */
const LAST_CHARACTER_COOKIE = 'orcisgate_last_character'
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export function getLastCharacterId(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${LAST_CHARACTER_COOKIE}=([^;]*)`))
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

export function setLastCharacterId(characterId: string): void {
  document.cookie = `${LAST_CHARACTER_COOKIE}=${encodeURIComponent(characterId)}; max-age=${ONE_YEAR_SECONDS}; path=/; samesite=lax`
}
