import { describe, expect, it } from 'vitest'
import { parseCharacterId } from './character-id.js'

describe('parseCharacterId', () => {
  it('accepts a bare numeric id', () => {
    expect(parseCharacterId('167672386')).toBe('167672386')
  })

  it('accepts a bare numeric id with surrounding whitespace', () => {
    expect(parseCharacterId('  167672386  ')).toBe('167672386')
  })

  it('extracts the id from a full character URL with a slug', () => {
    expect(parseCharacterId('https://www.dndbeyond.com/characters/167672386-nathaniel-twinty')).toBe(
      '167672386',
    )
  })

  it('extracts the id from a bare character URL without a slug', () => {
    expect(parseCharacterId('https://www.dndbeyond.com/characters/167672386')).toBe('167672386')
  })

  it('returns null for unrelated text', () => {
    expect(parseCharacterId('not a character url')).toBeNull()
  })

  it('returns null for a dndbeyond URL that is not a character page', () => {
    expect(parseCharacterId('https://www.dndbeyond.com/monsters/16909-goblin')).toBeNull()
  })
})
