import type { MonsterTemplate } from '@orcisgate/domain'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDb, type Db } from './db.js'

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
    sourceUrl: `https://www.dndbeyond.com/monsters/${id}`,
    avatarUrl: null,
  }
}

describe('createDb character cache', () => {
  let db: Db

  beforeEach(() => {
    db = createDb(':memory:')
  })

  afterEach(() => {
    db.close()
    vi.useRealTimers()
  })

  it('returns null for a character that was never cached', () => {
    expect(db.getCachedCharacter('167672386', 60_000)).toBeNull()
  })

  it('round-trips a cached payload within the TTL', () => {
    const payload = { data: { id: 167672386, name: 'Nathaniel Twinty' } }
    db.setCachedCharacter('167672386', payload)
    expect(db.getCachedCharacter('167672386', 60_000)).toEqual(payload)
  })

  it('treats a cached payload older than the TTL as a miss', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    db.setCachedCharacter('167672386', { data: { id: 167672386 } })

    vi.setSystemTime(new Date('2026-01-01T00:10:01.000Z')) // 10m01s later
    expect(db.getCachedCharacter('167672386', 10 * 60 * 1000)).toBeNull()
  })

  it('overwrites the previous payload for the same character id', () => {
    db.setCachedCharacter('167672386', { data: { id: 167672386, name: 'Old' } })
    db.setCachedCharacter('167672386', { data: { id: 167672386, name: 'New' } })
    expect(db.getCachedCharacter('167672386', 60_000)).toEqual({ data: { id: 167672386, name: 'New' } })
  })
})

describe('createDb monster templates', () => {
  let db: Db

  beforeEach(() => {
    db = createDb(':memory:')
  })

  afterEach(() => {
    db.close()
  })

  it('returns nothing for ids never seen', () => {
    expect(db.getMonsterTemplates(['16798'])).toEqual([])
  })

  it('returns an empty array without querying when given no ids', () => {
    expect(db.getMonsterTemplates([])).toEqual([])
  })

  it('persists monster templates globally, retrievable by id', () => {
    db.upsertMonsterTemplates([fakeMonster('16798', 'Bandit'), fakeMonster('16799', 'Bandit Captain')])

    const found = db.getMonsterTemplates(['16798', '16799'])
    expect(found.map((m) => m.name).sort()).toEqual(['Bandit', 'Bandit Captain'])
  })

  it('only returns the subset of requested ids it actually has', () => {
    db.upsertMonsterTemplates([fakeMonster('16798', 'Bandit')])
    expect(db.getMonsterTemplates(['16798', '99999']).map((m) => m.id)).toEqual(['16798'])
  })

  it('re-pasting the same monster id refreshes it rather than erroring', () => {
    db.upsertMonsterTemplates([fakeMonster('16798', 'Bandit')])
    db.upsertMonsterTemplates([{ ...fakeMonster('16798', 'Bandit'), armorClass: 99 }])

    expect(db.getMonsterTemplates(['16798'])[0]?.armorClass).toBe(99)
  })
})
