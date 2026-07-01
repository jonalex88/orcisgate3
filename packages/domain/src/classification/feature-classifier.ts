/**
 * Decides whether a class/racial/feat feature is passive (goes in the Passive Features list) or
 * active (something the player actually triggers). D&D Beyond's own class-feature entries never
 * carry a real `activation` value (always null in every sample seen), so this is necessarily a
 * text heuristic rather than a field read — unlike actions and spells, which do have a reliable
 * numeric activationType (see activation.ts) and don't go through this classifier at all.
 *
 * Validated by running it against every class feature, feat, and chosen option on a real level-4
 * Warlock/Cleric multiclass character and eyeballing the results. One known miss: feats phrased
 * as "you can choose to..." (e.g. Alert's initiative swap) read as active even though they don't
 * consume any part of the turn economy — acceptable given the manual-override escape hatch the
 * UI provides for every classification.
 */
const ACTIVE_LANGUAGE_PATTERNS = [
  /\byou can\b/i,
  /\byou may\b/i,
  /\bonce per\b/i,
  /\byou take (?:a|the)\b/i,
  /\bas an? (?:action|bonus action|reaction)\b/i,
  /\bimmediately after\b/i,
]

function stripHtml(html: string | null | undefined): string {
  return (html ?? '').replace(/<[^>]+>/g, ' ')
}

export function isPassiveFeature(description: string | null | undefined): boolean {
  const text = stripHtml(description)
  return !ACTIVE_LANGUAGE_PATTERNS.some((pattern) => pattern.test(text))
}
