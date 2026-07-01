import { describe, expect, it, vi } from 'vitest'
import { rollDice, rollDie } from './dice.js'

describe('rollDie', () => {
  it('maps random() in [0,1) onto the full die range', () => {
    expect(rollDie(20, () => 0)).toBe(1)
    expect(rollDie(20, () => 0.999999)).toBe(20)
    expect(rollDie(6, () => 0.5)).toBe(4)
  })

  it('defaults to Math.random when no rng is given', () => {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(rollDie(20)).toBe(1)
    spy.mockRestore()
  })
})

describe('rollDice', () => {
  it('rolls the requested count for each spec and sums the total', () => {
    let call = 0
    const sequence = [0, 0.5, 0.999999]
    const rng = () => sequence[call++ % sequence.length]!

    const result = rollDice([{ sides: 6, count: 2 }, { sides: 20, count: 1 }], rng)

    expect(result.results).toHaveLength(3)
    expect(result.total).toBe(result.results.reduce((a, b) => a + b, 0))
  })

  it('produces an empty roll for an empty dice list', () => {
    expect(rollDice([])).toEqual({ dice: [], results: [], total: 0 })
  })

  it('is fully deterministic given a fixed rng', () => {
    const rng = () => 0.5
    const a = rollDice([{ sides: 8, count: 3 }], rng)
    const b = rollDice([{ sides: 8, count: 3 }], rng)
    expect(a).toEqual(b)
  })
})
