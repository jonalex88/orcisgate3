import type { DiceSpec } from '../models/roll-event.js'

/**
 * Rolled client-side and trusted by the server (see the plan's "same-table trust-based tool"
 * decision) — this is tabletop dice, not a security-sensitive RNG use, so plain Math.random is
 * fine. Kept as a pure function of an injectable RNG so tests can be deterministic without
 * mocking global state.
 */
export function rollDie(sides: number, random: () => number = Math.random): number {
  return Math.floor(random() * sides) + 1
}

export interface DiceRollResult {
  dice: DiceSpec[]
  results: number[]
  total: number
}

export function rollDice(dice: DiceSpec[], random: () => number = Math.random): DiceRollResult {
  const results = dice.flatMap((spec) =>
    Array.from({ length: spec.count }, () => rollDie(spec.sides, random)),
  )
  return {
    dice,
    results,
    total: results.reduce((sum, r) => sum + r, 0),
  }
}
