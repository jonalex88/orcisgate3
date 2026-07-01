import { describe, expect, it } from 'vitest'
import monsterStatsFixture from '../__fixtures__/sample-monster-stats.json' with { type: 'json' }
import { mapMonsters } from './monster-mapper.js'

describe('mapMonsters', () => {
  const monsters = mapMonsters(monsterStatsFixture)

  it('maps both monsters from the fixture', () => {
    expect(monsters).toHaveLength(2)
    expect(monsters.map((m) => m.name)).toEqual(['Bandit', 'Bandit Captain'])
  })

  it('maps a simple monster (Bandit) with real stat-block values', () => {
    const bandit = monsters.find((m) => m.name === 'Bandit')!
    expect(bandit.id).toBe('16798')
    expect(bandit.armorClass).toBe(12)
    expect(bandit.averageHitPoints).toBe(11)
    expect(bandit.speed).toBe(30)
    expect(bandit.passivePerception).toBe(10)
    expect(bandit.abilityScores).toEqual({
      strength: 11,
      dexterity: 12,
      constitution: 12,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    })
    expect(bandit.actions.map((a) => a.name)).toEqual(['Scimitar', 'Light Crossbow'])
    expect(bandit.actions.every((a) => a.economyType === 'action')).toBe(true)
  })

  it('maps a monster with actions, a reaction, and a higher CR (Bandit Captain)', () => {
    const captain = monsters.find((m) => m.name === 'Bandit Captain')!
    expect(captain.armorClass).toBe(15)
    expect(captain.averageHitPoints).toBe(65)

    const byEconomy = (type: string) => captain.actions.filter((a) => a.economyType === type)
    expect(byEconomy('action').map((a) => a.name)).toEqual(['Multiattack', 'Scimitar', 'Dagger'])
    expect(byEconomy('reaction').map((a) => a.name)).toEqual(['Parry'])
    expect(byEconomy('bonusAction')).toEqual([])
    expect(byEconomy('legendaryAction')).toEqual([])
  })

  it('generates unique ids across all monsters and actions', () => {
    const allActionIds = monsters.flatMap((m) => m.actions.map((a) => a.id))
    expect(new Set(allActionIds).size).toBe(allActionIds.length)
  })
})
