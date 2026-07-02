export interface Scene {
  id: string
  name: string
  url: string
}

/**
 * Mood images the DM can broadcast to the party. These live in apps/web/public/scenes — Vite
 * copies `public/` verbatim into the build, so they're served automatically by the same static
 * file handling that serves the rest of the SPA (see apps/server/src/app.ts) with no extra server
 * code, and they work identically when running `apps/web` standalone in dev.
 */
export const SCENES: Scene[] = [
  { id: 'gothic-forest', name: 'Gothic Forest', url: '/scenes/gothic-forest.jpg' },
  { id: 'marketplace', name: 'Marketplace', url: '/scenes/marketplace.jpg' },
  { id: 'street-scene', name: 'Street Scene', url: '/scenes/street-scene.jpg' },
  { id: 'windmill-countryside', name: 'Windmill Countryside', url: '/scenes/windmill-countryside.jpeg' },
]

export function findScene(url: string | null): Scene | null {
  return SCENES.find((s) => s.url === url) ?? null
}
