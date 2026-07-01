import { describe, expect, it } from 'vitest'
import sampleEncounter from '../__fixtures__/sample-encounter.json' with { type: 'json' }
import { mapEncounter, referencedMonsterTemplateIds } from './encounter-mapper.js'

describe('mapEncounter', () => {
  const encounter = mapEncounter(sampleEncounter)

  it('maps round/turn state and counts from a real exported encounter', () => {
    expect(encounter.id).toBe('fa3620a5-2354-43b5-a6a3-23bacc147fb8')
    expect(encounter.roundNum).toBe(1)
    expect(encounter.turnNum).toBe(1)
    expect(encounter.monsters).toHaveLength(6)
    expect(encounter.groups).toHaveLength(2)
    expect(encounter.players).toHaveLength(5)
  })

  it('maps monster instances with their template reference and instance HP', () => {
    const firstBandit = encounter.monsters.find((m) => m.label === 'Bandit (A)')!
    expect(firstBandit.templateId).toBe('16798')
    expect(firstBandit.currentHp).toBe(11)
    expect(firstBandit.maxHp).toBe(11)

    const captain = encounter.monsters.find((m) => m.label === 'Bandit Captain (A)')!
    expect(captain.templateId).toBe('16799')
    expect(captain.maxHp).toBe(65)
  })

  it('maps player refs keyed by the same character id /api/characters/:id expects', () => {
    const characterIds = encounter.players.map((p) => p.characterId)
    expect(characterIds).toEqual(['900000010', '900000011', '900000012', '900000013', '900000014'])
  })

  it('deduplicates referenced monster template ids for the server to look up', () => {
    expect(referencedMonsterTemplateIds(encounter).sort()).toEqual(['16798', '16799'])
  })
})
