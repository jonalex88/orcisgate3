import { describe, expect, it } from 'vitest'
import adultRedDragon from '../__fixtures__/sample-open5e-adult-red-dragon.json' with { type: 'json' }
import banditCaptain from '../__fixtures__/sample-open5e-bandit-captain.json' with { type: 'json' }
import goblin from '../__fixtures__/sample-open5e-goblin.json' with { type: 'json' }
import { mapOpen5eCreature, open5eMonsterId } from './open5e-mapper.js'

describe('mapOpen5eCreature', () => {
  it('namespaces the id so it can never collide with a real D&D Beyond numeric id', () => {
    const monster = mapOpen5eCreature(goblin)
    expect(monster.id).toBe('open5e:srd_goblin')
    expect(monster.id).toBe(open5eMonsterId('srd_goblin'))
  })

  it('maps ability scores, AC, HP, speed, and passive perception directly', () => {
    const monster = mapOpen5eCreature(goblin)
    expect(monster.abilityScores).toEqual({
      strength: 8,
      dexterity: 14,
      constitution: 10,
      intelligence: 10,
      wisdom: 8,
      charisma: 8,
    })
    expect(monster.armorClass).toBe(15)
    expect(monster.armorClassDescription).toBe('leather armor, shield')
    expect(monster.averageHitPoints).toBe(7)
    expect(monster.speed).toBe(30)
    expect(monster.passivePerception).toBe(9)
  })

  it('parses a plain hit-dice string with no flat bonus', () => {
    const monster = mapOpen5eCreature(goblin)
    expect(monster.hitPointDice).toEqual({ diceCount: 2, diceValue: 6, fixedValue: 0, diceString: '2d6' })
  })

  it('parses a hit-dice string with a flat bonus and no spaces around the +', () => {
    const monster = mapOpen5eCreature(banditCaptain)
    expect(monster.hitPointDice).toEqual({ diceCount: 10, diceValue: 8, fixedValue: 20, diceString: '10d8+20' })
  })

  it('formats fractional and whole-number challenge ratings the way D&D usually displays them', () => {
    expect(mapOpen5eCreature(goblin).challengeRating).toBe('1/4')
    expect(mapOpen5eCreature(banditCaptain).challengeRating).toBe('2')
  })

  it('surfaces type/size/alignment directly since Open5e gives them as plain values, unlike DDB', () => {
    const monster = mapOpen5eCreature(banditCaptain)
    expect(monster.creatureType).toBe('Humanoid')
    expect(monster.size).toBe('Medium')
    expect(monster.alignment).toBe('any non-lawful alignment')
  })

  it('maps actions to the correct economy type by action_type', () => {
    const monster = mapOpen5eCreature(banditCaptain)
    const byName = (name: string) => monster.actions.find((a) => a.name === name)
    expect(byName('Scimitar')?.economyType).toBe('action')
    expect(byName('Multiattack')?.economyType).toBe('action')
    expect(byName('Parry')?.economyType).toBe('reaction')
  })

  it('maps legendary actions to the legendaryAction economy type', () => {
    const monster = mapOpen5eCreature(adultRedDragon)
    const legendary = monster.actions.filter((a) => a.economyType === 'legendaryAction')
    expect(legendary.length).toBeGreaterThan(0)
  })

  it('drops genuinely passive traits, but surfaces an active-sounding one (Nimble Escape) as an action', () => {
    const monster = mapOpen5eCreature(goblin)
    const nimbleEscape = monster.actions.find((a) => a.name === 'Nimble Escape')
    expect(nimbleEscape).toBeDefined()
    expect(nimbleEscape?.economyType).toBe('uncategorized')
  })

  it('generates unique action ids for a creature with both actions and active traits', () => {
    const monster = mapOpen5eCreature(goblin)
    const ids = monster.actions.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
