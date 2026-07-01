import { beforeEach, describe, expect, it } from 'vitest'
import { getLastCharacterId, setLastCharacterId } from './cookies.js'

describe('last-character cookie', () => {
  beforeEach(() => {
    document.cookie = 'orcisgate_last_character=; max-age=0; path=/'
  })

  it('returns null when no cookie has been set', () => {
    expect(getLastCharacterId()).toBeNull()
  })

  it('round-trips a character id', () => {
    setLastCharacterId('167672386')
    expect(getLastCharacterId()).toBe('167672386')
  })

  it('overwrites a previously stored id', () => {
    setLastCharacterId('167672386')
    setLastCharacterId('999999999')
    expect(getLastCharacterId()).toBe('999999999')
  })
})
