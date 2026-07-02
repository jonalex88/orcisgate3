import { isPassiveFeature } from '../classification/feature-classifier.js'
import type { ActionItem } from '../models/action.js'
import type { AbilityScores, Character, ClassLevel } from '../models/character.js'
import type { Feature } from '../models/feature.js'
import type { ResourcePool, RestType, SpellSlotPool } from '../models/resource.js'
import type { Spell, SpellSchool } from '../models/spell.js'
import { economyFromActivationType } from './activation.js'
import type { RawAction, RawCharacterData, RawClassFeature, RawInventoryItem } from './ddb-schema.js'
import { rawCharacterResponseSchema } from './ddb-schema.js'
import {
  abilityModifier,
  deriveAbilityScores,
  deriveArmorClass,
  deriveCurrentHp,
  deriveMaxHp,
  deriveSpeed,
  proficiencyBonusForLevel,
  totalCharacterLevel,
} from './derive-stats.js'
import { multiclassSlotsBySpellLevel, pactMagicSlots } from './spellcasting-table.js'

/** DDB's numeric reset-type enum. Only one live sample seen (Channel Divinity, resetType 2 →
 * long rest, correct for a level-4 Cleric under the 2024 rules). resetType 1 is the community's
 * long-documented value for short rest; treated as a reasonable default rather than verified. */
function restTypeFromResetType(resetType: number | null | undefined): RestType {
  return resetType === 1 ? 'shortRest' : 'longRest'
}

function schoolFromString(school: string): SpellSchool {
  const normalized = school.toLowerCase()
  const known: SpellSchool[] = [
    'abjuration',
    'conjuration',
    'divination',
    'enchantment',
    'evocation',
    'illusion',
    'necromancy',
    'transmutation',
  ]
  return known.find((s) => s === normalized) ?? 'evocation'
}

function mapClasses(data: RawCharacterData): ClassLevel[] {
  return data.classes.map((c) => ({
    name: c.definition.name,
    subclass: c.subclassDefinition?.name ?? null,
    level: c.level,
  }))
}

function mapActions(data: RawCharacterData): ActionItem[] {
  const groups: Array<[RawAction[], ActionItem['sourceKind']]> = [
    [data.actions.class, 'feature'],
    [data.actions.race, 'feature'],
    [data.actions.feat, 'feature'],
  ]

  return groups.flatMap(([rawActions, sourceKind]) =>
    rawActions.map((action): ActionItem => {
      const tags: string[] = []
      if (action.limitedUse?.maxUses != null) {
        tags.push(`${action.limitedUse.maxUses}/${restTypeFromResetType(action.limitedUse.resetType) === 'shortRest' ? 'short rest' : 'long rest'}`)
      }
      return {
        id: `action-${action.id}`,
        name: action.name,
        description: action.description ?? '',
        economyType: economyFromActivationType(action.activation?.activationType),
        sourceKind,
        isManualOverride: false,
        tags,
      }
    }),
  )
}

/**
 * Which ability drives a weapon's attack/damage roll. Finesse lets the wielder use whichever of
 * Strength/Dexterity is higher (real 5e rule); a ranged weapon always uses Dexterity; anything
 * else defaults to Strength. Verified against one real equipped weapon (a non-Finesse melee Mace,
 * which correctly resolves to Strength) — the Finesse/ranged branches follow the same rule but
 * haven't been exercised against a real Finesse or ranged weapon yet.
 */
function abilityModifierForWeapon(def: RawInventoryItem['definition'], abilityScores: AbilityScores): number {
  const properties = (def.properties ?? []).map((p) => p.name.toLowerCase())
  const strMod = abilityModifier(abilityScores.strength)
  const dexMod = abilityModifier(abilityScores.dexterity)
  if (properties.includes('finesse')) return Math.max(strMod, dexMod)
  if (def.attackType === 2) return dexMod
  return strMod
}

/**
 * Sums any flat attack/damage bonus a magic weapon grants via its own `grantedModifiers` (e.g. a
 * +1 weapon). Unverified against a real magic weapon — the one real sample this was built against
 * (`magic: false`) had an empty `grantedModifiers` array, so this is a reasonable-default
 * extrapolation of the same "sum bonus-type modifiers" pattern already used for ability scores
 * and AC in derive-stats.ts, not something cross-checked against a live +N weapon yet.
 */
function weaponMagicBonus(def: RawInventoryItem['definition']): number {
  return (def.grantedModifiers ?? [])
    .filter((m) => m.type === 'bonus')
    .reduce((sum, m) => sum + (m.value ?? 0), 0)
}

function formatSignedModifier(value: number): string {
  return value >= 0 ? `+${value}` : String(value)
}

/**
 * Turns each equipped weapon into a rollable attack. Off-hand/two-weapon-fighting bonus-action
 * attacks aren't modeled — every attack maps to the base Attack action's economy ('action') since
 * distinguishing an off-hand weapon from D&D Beyond's inventory data alone isn't reliable; a known
 * simplification, not silently guessed at.
 */
function mapWeaponAttacks(data: RawCharacterData, abilityScores: AbilityScores, proficiencyBonus: number): ActionItem[] {
  return data.inventory
    .filter((item) => item.equipped && item.definition.filterType === 'Weapon')
    .map((item): ActionItem => {
      const def = item.definition
      const mod = abilityModifierForWeapon(def, abilityScores)
      const magicBonus = weaponMagicBonus(def)
      const toHit = proficiencyBonus + mod + magicBonus

      const damageDice = def.damage?.diceString ?? (def.damage ? `${def.damage.diceCount ?? 1}d${def.damage.diceValue ?? 4}` : null)
      const damageMod = mod + magicBonus
      const damageType = def.damageType?.toLowerCase() ?? ''
      const damageText = damageDice
        ? `${damageDice}${damageMod !== 0 ? formatSignedModifier(damageMod) : ''} ${damageType}`.trim()
        : null

      const isRanged = def.attackType === 2
      const rangeText = isRanged
        ? `range ${def.range ?? '?'}/${def.longRange ?? '?'} ft.`
        : `reach ${def.range ?? 5} ft.`
      const attackKind = isRanged ? 'Ranged Weapon Attack' : 'Melee Weapon Attack'

      const description = `${attackKind}: ${formatSignedModifier(toHit)} to hit, ${rangeText}, one target.${damageText ? ` Hit: ${damageText} damage.` : ''}`
      const tags = [`${formatSignedModifier(toHit)} to hit`, damageText].filter((tag): tag is string => tag != null)

      return {
        id: `weapon-${item.id}`,
        name: def.name,
        description,
        economyType: 'action',
        sourceKind: 'weapon',
        isManualOverride: false,
        tags,
      }
    })
}

function mapSpells(data: RawCharacterData): Spell[] {
  return data.classSpells.flatMap((classSpells) =>
    classSpells.spells.map((spell): Spell => {
      const def = spell.definition
      const components = def.components ?? []
      return {
        id: `spell-${spell.id}`,
        name: def.name,
        description: def.description ?? '',
        level: def.level,
        school: schoolFromString(def.school),
        castingEconomy: economyFromActivationType(def.activation?.activationType),
        range: def.range?.rangeValue != null ? `${def.range.rangeValue} ft` : (def.range?.origin ?? 'Self'),
        components: {
          verbal: components.includes(1),
          somatic: components.includes(2),
          material: components.includes(3),
          ...(def.componentsDescription ? { materialDescription: def.componentsDescription } : {}),
        },
        concentration: def.concentration,
        ritual: def.ritual,
        prepared: spell.prepared,
        alwaysPrepared: spell.alwaysPrepared,
      }
    }),
  )
}

/**
 * D&D Beyond sometimes lists the same named feature twice with different text (seen on a real
 * character: "Blessed Strikes" once with a legacy-book caveat, once without) — most likely a
 * base-class-vs-subclass-resolution artifact in their data, not something a player chose twice.
 * Showing both looks like a rendering bug, so when names collide we keep the longer/more complete
 * description and drop the rest.
 */
function dedupeFeatures(features: Feature[]): Feature[] {
  const byName = new Map<string, Feature>()
  for (const feature of features) {
    const existing = byName.get(feature.name)
    if (!existing || feature.description.length > existing.description.length) {
      byName.set(feature.name, feature)
    }
  }
  return [...byName.values()]
}

function mapClassFeature(feature: RawClassFeature, source: string): Feature {
  const def = feature.definition
  return {
    id: `feature-${def.id}`,
    name: def.name,
    description: def.description ?? '',
    source,
    isPassive: isPassiveFeature(def.description),
  }
}

function mapFeatures(data: RawCharacterData): Feature[] {
  const classFeatures = data.classes.flatMap((c) =>
    c.classFeatures.map((f) => mapClassFeature(f, c.definition.name)),
  )
  const feats = data.feats.map(
    (feat): Feature => ({
      id: `feat-${feat.definition.id}`,
      name: feat.definition.name,
      description: feat.definition.description ?? '',
      source: 'Feat',
      isPassive: isPassiveFeature(feat.definition.description),
    }),
  )
  // Chosen options (e.g. Eldritch Invocations, fighting styles) — distinct from classFeatures,
  // which only describes the mechanic that grants the choice, not the choice itself.
  const chosenOptions = [...data.options.race, ...data.options.class, ...data.options.feat].map(
    (option): Feature => ({
      id: `option-${option.definition.id}`,
      name: option.definition.name,
      description: option.definition.description ?? '',
      source: 'Chosen Option',
      isPassive: isPassiveFeature(option.definition.description),
    }),
  )
  return dedupeFeatures([...classFeatures, ...feats, ...chosenOptions])
}

/**
 * `spellSlots[].available` and `pactMagic[].available` in the raw payload can't be trusted — on
 * the real multiclass character this was built against, both were 0 at every level despite the
 * character (a Cleric 3/Warlock 1) definitely having slots in play. Same "computed client-side,
 * not sent by the API" pattern as AC (see derive-stats.ts). Instead of trusting `available`, this
 * computes the real max from the official multiclass spellcaster slot table and the separate
 * Warlock Pact Magic table (spellcasting-table.ts), and only trusts `used` from the raw payload
 * for how many of those are currently spent.
 */
function mapSpellSlots(data: RawCharacterData, classes: ClassLevel[]): SpellSlotPool[] {
  const maxBySpellLevel = multiclassSlotsBySpellLevel(classes)
  const usedBySpellLevel = new Map(data.spellSlots.map((slot) => [slot.level, slot.used]))

  return maxBySpellLevel
    .map((max, level) => ({ level, max, current: max - (usedBySpellLevel.get(level) ?? 0) }))
    .filter((slot) => slot.level > 0 && slot.max > 0)
}

function mapPactMagicResources(data: RawCharacterData, classes: ClassLevel[]): ResourcePool[] {
  const pact = pactMagicSlots(classes)
  if (!pact) return []
  const used = data.pactMagic.find((slot) => slot.level === pact.slotLevel)?.used ?? 0
  return [
    {
      id: `pact-magic-${pact.slotLevel}`,
      name: `Pact Magic (Level ${pact.slotLevel})`,
      current: pact.slots - used,
      max: pact.slots,
      resetsOn: 'shortRest',
    },
  ]
}

function mapActionResources(data: RawCharacterData): ResourcePool[] {
  const allActions = [...data.actions.class, ...data.actions.race, ...data.actions.feat]
  return allActions
    .filter((action) => action.limitedUse?.maxUses != null)
    .map((action) => ({
      id: `resource-${action.id}`,
      name: action.name,
      current: (action.limitedUse!.maxUses ?? 0) - (action.limitedUse!.numberUsed ?? 0),
      max: action.limitedUse!.maxUses ?? 0,
      resetsOn: restTypeFromResetType(action.limitedUse!.resetType),
    }))
}

/**
 * Converts a raw D&D Beyond character-service payload into our normalized Character model.
 * Throws (via zod) on shapes it doesn't recognize rather than silently producing a broken
 * character — see packages/domain/README.md for exactly which endpoint/fields this expects.
 */
export function mapCharacter(rawPayload: unknown): Character {
  const { data } = rawCharacterResponseSchema.parse(rawPayload)

  const abilityScores = deriveAbilityScores(data)
  const level = totalCharacterLevel(data)
  const maxHp = deriveMaxHp(data, abilityScores)
  const classes = mapClasses(data)
  const proficiencyBonus = proficiencyBonusForLevel(level)

  return {
    id: String(data.id),
    name: data.name,
    avatarUrl: data.decorations?.avatarUrl ?? null,
    classes,
    level,
    abilityScores,
    proficiencyBonus,
    armorClass: deriveArmorClass(data, abilityScores),
    maxHp,
    speed: deriveSpeed(data),
    actions: [...mapActions(data), ...mapWeaponAttacks(data, abilityScores, proficiencyBonus)],
    spells: mapSpells(data),
    spellSlots: mapSpellSlots(data, classes),
    features: mapFeatures(data),
    inventory: [],
    resources: [...mapPactMagicResources(data, classes), ...mapActionResources(data)],
  }
}

export function deriveInitialCurrentHp(rawPayload: unknown): number {
  const { data } = rawCharacterResponseSchema.parse(rawPayload)
  const abilityScores = deriveAbilityScores(data)
  return deriveCurrentHp(data, deriveMaxHp(data, abilityScores))
}
