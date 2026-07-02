import type { MonsterTemplate } from '@orcisgate/domain'
import { describe, expect, it } from 'vitest'
import sampleEncounter from './__fixtures__/sample-encounter.json' with { type: 'json' }
import { createDb, type Db } from './db.js'
import { resolveEncounterImport } from './encounter-import.js'

function fakeMonster(id: string, name: string): MonsterTemplate {
  return {
    id,
    name,
    abilityScores: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
    armorClass: 12,
    armorClassDescription: '',
    hitPointDice: { diceCount: 2, diceValue: 8, fixedValue: 2, diceString: '2d8 + 2' },
    averageHitPoints: 11,
    speed: 30,
    passivePerception: 10,
    actions: [],
    sourceUrl: `https://example.com/monsters/${id}`,
    avatarUrl: null,
  }
}

describe('resolveEncounterImport name fallback', () => {
  function makeDb(): Db {
    return createDb(':memory:')
  }

  it('reports every referenced monster as missing when the library has nothing at all', () => {
    const db = makeDb()
    const result = resolveEncounterImport(db, sampleEncounter)

    expect(result.missingMonsterIds.sort()).toEqual(['16798', '16799'])
    expect(result.nameMatchedMonsterIds).toEqual([])
    db.close()
  })

  it('resolves a monster by exact id without touching the name fallback', () => {
    const db = makeDb()
    db.upsertMonsterTemplates([fakeMonster('16798', 'Bandit'), fakeMonster('16799', 'Bandit Captain')])

    const result = resolveEncounterImport(db, sampleEncounter)

    expect(result.missingMonsterIds).toEqual([])
    expect(result.nameMatchedMonsterIds).toEqual([])
    expect(result.monsters.map((m) => m.id).sort()).toEqual(['16798', '16799'])
  })

  it('falls back to a normalized-name match for a pre-seeded monster under a different id', () => {
    const db = makeDb()
    // Seeded ahead of time from an open compendium, under its own id scheme — not DDB's.
    db.upsertMonsterTemplates([fakeMonster('seed:bandit', 'Bandit')])

    const result = resolveEncounterImport(db, sampleEncounter)

    expect(result.nameMatchedMonsterIds).toContain('16798')
    expect(result.missingMonsterIds).not.toContain('16798')
    // Re-keyed under the id the encounter actually referenced, so downstream lookups by
    // templateId (activeEncounterMonsters.find(m => m.id === instance.templateId)) just work.
    const resolved = result.monsters.find((m) => m.id === '16798')
    expect(resolved?.name).toBe('Bandit')
    // Bandit Captain was never seeded under any id or name, so it's still genuinely missing.
    expect(result.missingMonsterIds).toEqual(['16799'])
  })

  it('prefers an exact id match over a same-named seeded monster under a different id', () => {
    const db = makeDb()
    db.upsertMonsterTemplates([fakeMonster('seed:bandit', 'Bandit'), fakeMonster('16798', 'Bandit')])

    const result = resolveEncounterImport(db, sampleEncounter)

    expect(result.nameMatchedMonsterIds).not.toContain('16798')
    expect(result.monsters.find((m) => m.id === '16798')).toBeDefined()
  })
})
