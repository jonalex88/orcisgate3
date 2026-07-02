import { describe, expect, it } from 'vitest'
import { normalizeMonsterName } from './monster-name.js'

describe('normalizeMonsterName', () => {
  it('lowercases a plain name', () => {
    expect(normalizeMonsterName('Bandit')).toBe('bandit')
  })

  it('strips a trailing disambiguation suffix like D&D Beyond adds to encounter instances', () => {
    expect(normalizeMonsterName('Bandit (A)')).toBe('bandit')
    expect(normalizeMonsterName('Bandit Captain (B)')).toBe('bandit captain')
  })

  it('strips punctuation and collapses to single spaces', () => {
    expect(normalizeMonsterName("Will-o'-Wisp")).toBe('will o wisp')
  })

  it('strips diacritics', () => {
    expect(normalizeMonsterName('Naïve Spectre')).toBe('naive spectre')
  })

  it('two instances of the same monster type normalize to the same string', () => {
    expect(normalizeMonsterName('Bandit (A)')).toBe(normalizeMonsterName('Bandit (B)'))
  })

  it('does not strip a non-trailing parenthetical, only a trailing one', () => {
    expect(normalizeMonsterName('Owlbear (Wild) Cub')).toBe('owlbear wild cub')
  })
})
