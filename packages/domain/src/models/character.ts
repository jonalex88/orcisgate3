import type { ActionItem } from './action.js'
import type { Spell } from './spell.js'
import type { Feature } from './feature.js'
import type { InventoryItem } from './inventory.js'
import type { ResourcePool, SpellSlotPool } from './resource.js'

export type AbilityName = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma'

export type AbilityScores = Record<AbilityName, number>

export interface ClassLevel {
  name: string
  subclass: string | null
  level: number
}

export interface Character {
  id: string
  name: string
  avatarUrl: string | null
  classes: ClassLevel[]
  level: number
  abilityScores: AbilityScores
  proficiencyBonus: number
  armorClass: number
  maxHp: number
  speed: number

  actions: ActionItem[]
  spells: Spell[]
  spellSlots: SpellSlotPool[]
  features: Feature[]
  inventory: InventoryItem[]
  resources: ResourcePool[]
}
