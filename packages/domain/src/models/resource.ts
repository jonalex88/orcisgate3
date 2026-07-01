export type RestType = 'shortRest' | 'longRest'

/** Generic tracker so new resource types (ki, rage, superiority dice, hit dice, ...) need no model changes. */
export interface ResourcePool {
  id: string
  name: string
  current: number
  max: number
  resetsOn: RestType | 'dawn' | 'never'
}

export interface SpellSlotPool {
  level: number
  current: number
  max: number
}
