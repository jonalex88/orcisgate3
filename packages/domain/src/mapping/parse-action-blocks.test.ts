import { describe, expect, it } from 'vitest'
import monsterStats from '../__fixtures__/sample-monster-stats.json' with { type: 'json' }
import { parseActionBlocks } from './parse-action-blocks.js'

const bandit = monsterStats.data.find((m) => m.name === 'Bandit')!
const banditCaptain = monsterStats.data.find((m) => m.name === 'Bandit Captain')!

describe('parseActionBlocks', () => {
  it('returns an empty array for empty/missing html', () => {
    expect(parseActionBlocks('', 'action', 'm1')).toEqual([])
    expect(parseActionBlocks(null, 'action', 'm1')).toEqual([])
    expect(parseActionBlocks(undefined, 'action', 'm1')).toEqual([])
  })

  it('splits a real actionsDescription into one card per paragraph, extracting the bolded name', () => {
    const actions = parseActionBlocks(bandit.actionsDescription, 'action', 'monster-16798')
    expect(actions.map((a) => a.name)).toEqual(['Scimitar', 'Light Crossbow'])
    expect(actions.every((a) => a.economyType === 'action')).toBe(true)
    expect(actions.every((a) => a.sourceKind === 'monster')).toBe(true)
    expect(actions[0]?.description).toContain('Scimitar')
  })

  it('extracts a multi-attack lead-in and reaction names from a real multi-action stat block', () => {
    const actions = parseActionBlocks(banditCaptain.actionsDescription, 'action', 'monster-16799')
    expect(actions.map((a) => a.name)).toEqual(['Multiattack', 'Scimitar', 'Dagger'])

    const reactions = parseActionBlocks(banditCaptain.reactionsDescription, 'reaction', 'monster-16799')
    expect(reactions.map((a) => a.name)).toEqual(['Parry'])
    expect(reactions[0]?.economyType).toBe('reaction')
  })

  it('produces distinct, stable ids across economy types for the same monster', () => {
    const actions = parseActionBlocks(banditCaptain.actionsDescription, 'action', 'monster-16799')
    const reactions = parseActionBlocks(banditCaptain.reactionsDescription, 'reaction', 'monster-16799')
    const ids = [...actions, ...reactions].map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
