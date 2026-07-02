/**
 * Not real access control (see the README's "no accounts" simplification) — just a guard against
 * accidentally landing on the DM view (a stale bookmark, browser history, a shared link) without
 * ever having gone through the join screen's "I am the Dungeon Master" checkbox for this specific
 * game. Still trivially bypassable via devtools; the point is to stop *accidental* access, not
 * determined access, matching the same-table trust model this app is built around.
 */
const PREFIX = 'orcisgate_dm_'

export function markAsDm(gameKey: string): void {
  localStorage.setItem(PREFIX + gameKey, 'true')
}

export function isConfirmedDm(gameKey: string): boolean {
  return localStorage.getItem(PREFIX + gameKey) === 'true'
}
