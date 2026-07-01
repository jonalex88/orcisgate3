import { z } from 'zod'

/**
 * Schemas for the subset of D&D Beyond's undocumented character-service response this app
 * depends on. This is intentionally NOT a full reconstruction of DDB's shape — only the fields
 * CharacterMapper reads. Unknown fields are silently dropped (zod's default `.strip()`), which
 * is fine: we only ever read through these typed accessors, never touch `data.data` directly.
 *
 * Several D&D Beyond list fields (`actions.*`, `options.*`, `modifiers.*`) are `null` rather than
 * `[]` when empty for a given source (race/class/background/item/feat) — `nullableArray` below
 * normalizes that.
 */
const nullableArray = <T extends z.ZodTypeAny>(item: T) =>
  z
    .array(item)
    .nullable()
    .optional()
    .transform((value) => value ?? [])

const rawActivationSchema = z
  .object({
    activationTime: z.number().nullable().optional(),
    activationType: z.number().nullable().optional(),
  })
  .nullable()
  .optional()

const rawLimitedUseSchema = z
  .object({
    maxUses: z.number().nullable().optional(),
    numberUsed: z.number().nullable().optional(),
    resetType: z.number().nullable().optional(),
  })
  .nullable()
  .optional()

const rawStatSchema = z.object({
  id: z.number(),
  value: z.number().nullable(),
})

const rawModifierSchema = z.object({
  type: z.string(),
  subType: z.string(),
  value: z.number().nullable().optional(),
  friendlySubtypeName: z.string().nullable().optional(),
})

const rawModifierGroupSchema = z.object({
  race: nullableArray(rawModifierSchema),
  class: nullableArray(rawModifierSchema),
  background: nullableArray(rawModifierSchema),
  item: nullableArray(rawModifierSchema),
  feat: nullableArray(rawModifierSchema),
  condition: nullableArray(rawModifierSchema),
})

const rawClassFeatureDefinitionSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
  snippet: z.string().nullable().optional(),
  activation: rawActivationSchema,
})

const rawClassFeatureSchema = z.object({
  definition: rawClassFeatureDefinitionSchema,
})

const rawClassSchema = z.object({
  id: z.number(),
  level: z.number(),
  isStartingClass: z.boolean(),
  definition: z.object({ name: z.string() }),
  subclassDefinition: z.object({ name: z.string() }).nullable().optional(),
  classFeatures: z.array(rawClassFeatureSchema),
})

const rawSpellDefinitionSchema = z.object({
  id: z.number(),
  name: z.string(),
  level: z.number(),
  school: z.string(),
  description: z.string().nullable().optional(),
  concentration: z.boolean(),
  ritual: z.boolean(),
  activation: rawActivationSchema,
  range: z
    .object({
      rangeValue: z.number().nullable().optional(),
      origin: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  components: z.array(z.number()).nullable().optional(),
  componentsDescription: z.string().nullable().optional(),
})

const rawSpellSchema = z.object({
  id: z.number(),
  definition: rawSpellDefinitionSchema,
  prepared: z.boolean(),
  alwaysPrepared: z.boolean(),
})

const rawClassSpellsSchema = z.object({
  characterClassId: z.number(),
  spells: z.array(rawSpellSchema),
})

const rawActionSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  description: z.string().nullable().optional(),
  activation: rawActivationSchema,
  limitedUse: rawLimitedUseSchema,
})

const rawActionGroupSchema = z.object({
  race: nullableArray(rawActionSchema),
  class: nullableArray(rawActionSchema),
  background: nullableArray(rawActionSchema),
  item: nullableArray(rawActionSchema),
  feat: nullableArray(rawActionSchema),
})

const rawSpellSlotSchema = z.object({
  level: z.number(),
  used: z.number(),
  available: z.number(),
})

const rawOptionDefinitionSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
})

const rawOptionSchema = z.object({
  definition: rawOptionDefinitionSchema,
})

const rawOptionGroupSchema = z.object({
  race: nullableArray(rawOptionSchema),
  class: nullableArray(rawOptionSchema),
  background: nullableArray(rawOptionSchema),
  item: nullableArray(rawOptionSchema),
  feat: nullableArray(rawOptionSchema),
})

const rawFeatSchema = z.object({
  definition: z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
  }),
})

const rawWeightSpeedsSchema = z
  .object({
    normal: z
      .object({
        walk: z.number().nullable().optional(),
      })
      .nullable()
      .optional(),
  })
  .nullable()
  .optional()

export const rawCharacterDataSchema = z.object({
  id: z.number(),
  name: z.string(),
  decorations: z
    .object({ avatarUrl: z.string().nullable().optional() })
    .nullable()
    .optional(),
  stats: z.array(rawStatSchema).length(6),
  bonusStats: z.array(rawStatSchema).length(6),
  overrideStats: z.array(rawStatSchema).length(6),
  baseHitPoints: z.number(),
  bonusHitPoints: z.number().nullable().optional(),
  overrideHitPoints: z.number().nullable().optional(),
  removedHitPoints: z.number(),
  temporaryHitPoints: z.number(),
  race: z.object({ weightSpeeds: rawWeightSpeedsSchema }),
  classes: z.array(rawClassSchema),
  feats: z.array(rawFeatSchema),
  spellSlots: z.array(rawSpellSlotSchema),
  pactMagic: z.array(rawSpellSlotSchema),
  classSpells: z.array(rawClassSpellsSchema),
  actions: rawActionGroupSchema,
  options: rawOptionGroupSchema,
  modifiers: rawModifierGroupSchema,
})

export const rawCharacterResponseSchema = z.object({
  data: rawCharacterDataSchema,
})

export type RawCharacterData = z.infer<typeof rawCharacterDataSchema>
export type RawSpell = z.infer<typeof rawSpellSchema>
export type RawAction = z.infer<typeof rawActionSchema>
export type RawClassFeature = z.infer<typeof rawClassFeatureSchema>
export type RawModifier = z.infer<typeof rawModifierSchema>
