export interface Scene {
  id: string
  name: string
  url: string
  gradient: string
}

/**
 * Placeholder scenes (generic archetypes, not any specific published setting's named locations)
 * until real mood images are added — see the plan. Each scene's "image" is just a CSS gradient
 * for now; swapping in a real `url` per scene is enough to make this render actual art later.
 */
export const PLACEHOLDER_SCENES: Scene[] = [
  { id: 'tavern', name: 'Tavern', url: 'placeholder:tavern', gradient: 'from-amber-950 to-obsidian-900' },
  { id: 'forest', name: 'Forest Path', url: 'placeholder:forest', gradient: 'from-emerald-950 to-obsidian-900' },
  { id: 'dungeon', name: 'Dungeon Corridor', url: 'placeholder:dungeon', gradient: 'from-slate-900 to-obsidian-900' },
  { id: 'throne', name: 'Throne Room', url: 'placeholder:throne', gradient: 'from-violet-950 to-obsidian-900' },
  { id: 'battlefield', name: 'Battlefield', url: 'placeholder:battlefield', gradient: 'from-red-950 to-obsidian-900' },
]

export function findScene(url: string | null): Scene | null {
  return PLACEHOLDER_SCENES.find((s) => s.url === url) ?? null
}
