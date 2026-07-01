import { describe, expect, it } from 'vitest'
import { multiclassCasterLevel, multiclassSlotsBySpellLevel, pactMagicSlots } from './spellcasting-table.js'

describe('multiclassCasterLevel', () => {
  it('sums full casters at full level', () => {
    expect(multiclassCasterLevel([{ name: 'Cleric', subclass: null, level: 5 }])).toBe(5)
  })

  it('excludes Warlock entirely (Pact Magic is tracked separately)', () => {
    expect(multiclassCasterLevel([{ name: 'Warlock', subclass: null, level: 10 }])).toBe(0)
  })

  it('rounds half casters down and Artificer up', () => {
    expect(multiclassCasterLevel([{ name: 'Paladin', subclass: null, level: 3 }])).toBe(1)
    expect(multiclassCasterLevel([{ name: 'Artificer', subclass: null, level: 3 }])).toBe(2)
  })

  it('rounds third-caster subclasses down by 3', () => {
    expect(multiclassCasterLevel([{ name: 'Fighter', subclass: 'Eldritch Knight', level: 9 }])).toBe(3)
  })

  it('sums contributions across multiple classes', () => {
    const classes = [
      { name: 'Cleric', subclass: 'Twilight Domain (TCoE)', level: 3 },
      { name: 'Warlock', subclass: null, level: 1 },
    ]
    expect(multiclassCasterLevel(classes)).toBe(3)
  })
})

describe('multiclassSlotsBySpellLevel', () => {
  it('matches the PHB table at caster level 3 (4 first-level, 2 second-level)', () => {
    const slots = multiclassSlotsBySpellLevel([{ name: 'Cleric', subclass: null, level: 3 }])
    expect(slots[1]).toBe(4)
    expect(slots[2]).toBe(2)
    expect(slots[3]).toBe(0)
  })

  it('returns all zeros for a non-caster', () => {
    const slots = multiclassSlotsBySpellLevel([{ name: 'Fighter', subclass: null, level: 5 }])
    expect(slots.every((n) => n === 0)).toBe(true)
  })
})

describe('pactMagicSlots', () => {
  it('returns null for a character with no Warlock levels', () => {
    expect(pactMagicSlots([{ name: 'Cleric', subclass: null, level: 5 }])).toBeNull()
  })

  it('gives Warlock 1 a single level-1 slot', () => {
    expect(pactMagicSlots([{ name: 'Warlock', subclass: null, level: 1 }])).toEqual({
      slotLevel: 1,
      slots: 1,
    })
  })

  it('gives Warlock 11 three level-5 slots', () => {
    expect(pactMagicSlots([{ name: 'Warlock', subclass: null, level: 11 }])).toEqual({
      slotLevel: 5,
      slots: 3,
    })
  })
})
