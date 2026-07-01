import type { EconomyType } from './action.js'

export type SpellSchool =
  | 'abjuration'
  | 'conjuration'
  | 'divination'
  | 'enchantment'
  | 'evocation'
  | 'illusion'
  | 'necromancy'
  | 'transmutation'

export interface Spell {
  id: string
  name: string
  description: string
  /** 0 = cantrip */
  level: number
  school: SpellSchool
  castingEconomy: EconomyType
  range: string
  components: {
    verbal: boolean
    somatic: boolean
    material: boolean
    materialDescription?: string
  }
  concentration: boolean
  ritual: boolean
  prepared: boolean
  alwaysPrepared: boolean
}
