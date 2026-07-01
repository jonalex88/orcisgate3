import type { DiceSpec, Encounter, MonsterTemplate } from '@orcisgate/domain'

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errorBody = await res.json().catch(() => null)
    throw new Error((errorBody as { error?: string } | null)?.error ?? `Request to ${url} failed (${res.status})`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export interface SubmitRollInput {
  actorName: string
  actorRole: 'player' | 'dm'
  characterId: string | null
  label: string
  dice: DiceSpec[]
  results: number[]
  total: number
  isHiddenFromPlayers?: boolean
}

export interface EncounterImportResult {
  encounter: Encounter
  monsters: MonsterTemplate[]
  missingMonsterIds: string[]
}

export function submitRoll(gameKey: string, input: SubmitRollInput) {
  return postJson(`/api/games/${gameKey}/rolls`, input)
}

export function importMonsters(rawJson: unknown) {
  return postJson<{ imported: { id: string; name: string }[] }>('/api/monsters', rawJson)
}

export function importEncounter(gameKey: string, rawJson: unknown) {
  return postJson<EncounterImportResult>(`/api/games/${gameKey}/encounters`, rawJson)
}

export function rollInitiative(gameKey: string, encounterId: string) {
  return postJson<{ encounter: Encounter }>(`/api/games/${gameKey}/encounters/${encounterId}/roll-initiative`, {})
}

export function exitEncounter(gameKey: string, encounterId: string) {
  return postJson<void>(`/api/games/${gameKey}/encounters/${encounterId}/exit`, {})
}

export function setMoodImage(gameKey: string, url: string | null) {
  return postJson<void>(`/api/games/${gameKey}/mood-image`, { url })
}

export function updateGameSettings(gameKey: string, settings: { showDmRollsToPlayers: boolean }) {
  return postJson<void>(`/api/games/${gameKey}/settings`, settings)
}
