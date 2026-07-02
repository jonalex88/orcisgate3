import { describe, expect, it } from 'vitest'
import sampleCharacterResponse from '../__fixtures__/sample-character.json'
import { mapCharacter } from './character-mapper.js'

describe('mapCharacter', () => {
  const character = mapCharacter(sampleCharacterResponse)

  it('maps identity and derived combat stats, cross-checked against the real rendered sheet', () => {
    expect(character.name).toBe('Nathaniel Twinty')
    expect(character.level).toBe(4)
    expect(character.classes).toEqual([
      { name: 'Warlock', subclass: null, level: 1 },
      { name: 'Cleric', subclass: 'Twilight Domain (TCoE)', level: 3 },
    ])
    // Verified against the character's actual DDB sheet screenshot.
    expect(character.maxHp).toBe(39)
    expect(character.armorClass).toBe(13)
    expect(character.speed).toBe(35)
    expect(character.proficiencyBonus).toBe(2)
    expect(character.abilityScores).toEqual({
      strength: 12,
      dexterity: 16,
      constitution: 18,
      intelligence: 14,
      wisdom: 16,
      charisma: 7,
    })
  })

  it('classifies actions using real activationType data (1=action, 3=bonusAction)', () => {
    const channelDivinity = character.actions.find((a) => a.name === 'Channel Divinity')
    expect(channelDivinity?.economyType).toBe('action')
    expect(channelDivinity?.tags).toContain('2/long rest')
  })

  it('maps an equipped weapon into a rollable Attack action (STR 12 + proficiency 2 = +3 to hit)', () => {
    const mace = character.actions.find((a) => a.name === 'Mace')
    expect(mace).toMatchObject({
      economyType: 'action',
      sourceKind: 'weapon',
      description: 'Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 1d6+1 bludgeoning damage.',
      tags: ['+3 to hit', '1d6+1 bludgeoning'],
    })
  })

  it('maps spells with level, concentration, and casting-time-derived economy type', () => {
    const eldritchBlast = character.spells.find((s) => s.name === 'Eldritch Blast')
    expect(eldritchBlast).toMatchObject({ level: 0, castingEconomy: 'action', concentration: false })

    const armorOfAgathys = character.spells.find((s) => s.name === 'Armor of Agathys')
    expect(armorOfAgathys?.castingEconomy).toBe('bonusAction')

    const bless = character.spells.find((s) => s.name === 'Bless')
    expect(bless).toMatchObject({ concentration: true, prepared: true })
  })

  it('classifies features as passive or active via the text heuristic', () => {
    const eldritchMind = character.features.find((f) => f.name === 'Eldritch Mind')
    expect(eldritchMind?.isPassive).toBe(true)

    const magicalCunning = character.features.find((f) => f.name === 'Magical Cunning')
    expect(magicalCunning?.isPassive).toBe(false)
  })

  it('deduplicates features that D&D Beyond lists more than once with identical text', () => {
    const blessedStrikesCount = character.features.filter((f) => f.name === 'Blessed Strikes').length
    expect(blessedStrikesCount).toBe(1)
  })

  it('computes real spell slots from the multiclass table rather than trusting DDB\'s (broken) available field', () => {
    // Cleric 3 alone (Warlock doesn't contribute to the multiclass table) -> caster level 3.
    expect(character.spellSlots).toEqual([
      { level: 1, current: 4, max: 4 },
      { level: 2, current: 2, max: 2 },
    ])
  })

  it('computes Pact Magic as a separate short-rest resource from the Warlock pact-slot table', () => {
    // Warlock 1 -> one level-1 pact slot.
    const pactSlot = character.resources.find((r) => r.name.startsWith('Pact Magic'))
    expect(pactSlot).toEqual({
      id: 'pact-magic-1',
      name: 'Pact Magic (Level 1)',
      current: 1,
      max: 1,
      resetsOn: 'shortRest',
    })
  })
})
