import { z } from 'zod'

/**
 * Schema for Open5e's v2 creature detail endpoint (`api.open5e.com/v2/creatures/{key}/?depth=1`),
 * an open (OGL-licensed) compendium aggregating the SRD plus assorted third-party OGL publishers
 * — used to pre-seed the monster library with a starter set that doesn't require a live D&D
 * Beyond account to populate. See packages/domain/README.md for how this reconciles with DDB's
 * id-keyed library (short version: namespaced ids + the name-match fallback).
 *
 * Only the fields the mapper reads are modeled — Open5e's response includes a lot more
 * (environments, source document metadata, cross-references) this app has no use for.
 */
const rawNamedRefSchema = z.object({ name: z.string() })

const rawAbilityScoresSchema = z.object({
  strength: z.number(),
  dexterity: z.number(),
  constitution: z.number(),
  intelligence: z.number(),
  wisdom: z.number(),
  charisma: z.number(),
})

const rawActionSchema = z.object({
  name: z.string(),
  desc: z.string(),
  action_type: z.string(),
})

const rawTraitSchema = z.object({
  name: z.string(),
  desc: z.string(),
})

export const rawOpen5eCreatureSchema = z.object({
  key: z.string(),
  name: z.string(),
  type: rawNamedRefSchema.nullable().optional(),
  size: rawNamedRefSchema.nullable().optional(),
  alignment: z.string().nullable().optional(),
  challenge_rating: z.number().nullable().optional(),
  armor_class: z.number(),
  armor_detail: z.string().nullable().optional(),
  hit_points: z.number(),
  hit_dice: z.string().nullable().optional(),
  ability_scores: rawAbilityScoresSchema,
  passive_perception: z.number(),
  speed: z.object({ walk: z.number().nullable().optional() }).nullable().optional(),
  actions: z.array(rawActionSchema),
  traits: z.array(rawTraitSchema),
})

export type RawOpen5eCreature = z.infer<typeof rawOpen5eCreatureSchema>

/** The list endpoint's items are the same shape, wrapped in DRF-style pagination. */
export const rawOpen5eCreatureListResponseSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  results: z.array(rawOpen5eCreatureSchema),
})
