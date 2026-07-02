import { beforeEach, describe, expect, it } from 'vitest'
import { isConfirmedDm, markAsDm } from './dm-flag.js'

describe('dm-flag', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('is not confirmed for a game that was never marked', () => {
    expect(isConfirmedDm('hellokitty')).toBe(false)
  })

  it('is confirmed once marked', () => {
    markAsDm('hellokitty')
    expect(isConfirmedDm('hellokitty')).toBe(true)
  })

  it('is scoped per game key', () => {
    markAsDm('hellokitty')
    expect(isConfirmedDm('some-other-game')).toBe(false)
  })
})
