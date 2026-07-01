import type { ActionItem, EconomyType } from '../models/action.js'

/**
 * D&D Beyond splits a monster's actions across separate HTML fields per economy type
 * (actionsDescription, bonusActionsDescription, reactionsDescription, legendaryActionsDescription,
 * mythicActionsDescription) rather than giving each action a structured activation value the way
 * spells/character-actions do. Within a field, individual actions are `<p>` blocks whose first
 * bolded phrase is the name (e.g. "<p><strong>Multiattack.</strong> ...", sometimes wrapped in an
 * extra <em>) — confirmed against real Bandit/Bandit Captain stat blocks. Unrecognized paragraphs
 * still become a card (name falls back to a generic label) rather than being dropped.
 */
const ACTION_NAME_PATTERN = /<p>\s*(?:<em>)?\s*<strong>([^<]+?)\.<\/strong>/i

export function parseActionBlocks(
  html: string | null | undefined,
  economyType: EconomyType,
  idPrefix: string,
): ActionItem[] {
  if (!html) return []

  const paragraphs = html.match(/<p>[\s\S]*?<\/p>/gi) ?? []

  return paragraphs.map((paragraph, index) => {
    const name = ACTION_NAME_PATTERN.exec(paragraph)?.[1]?.trim()
    return {
      id: `${idPrefix}-${economyType}-${index}`,
      name: name ?? `${economyType} ${index + 1}`,
      description: paragraph,
      economyType,
      sourceKind: 'monster',
      isManualOverride: false,
      tags: [],
    }
  })
}
