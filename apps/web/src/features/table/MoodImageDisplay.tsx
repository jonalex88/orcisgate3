import { findScene } from './scenes.js'

interface MoodImageDisplayProps {
  url: string | null
  /**
   * Player view shows this as a slim always-visible banner above the table rather than a tall
   * inline block — the character sheet is the primary combat surface and shouldn't require
   * scrolling past a large scene image to reach it.
   */
  compact?: boolean
}

export function MoodImageDisplay({ url, compact }: MoodImageDisplayProps) {
  if (!url) return null

  const scene = findScene(url)

  return (
    <div
      className={
        compact
          ? 'flex h-20 shrink-0 items-end border-b border-obsidian-700 bg-cover bg-center p-3'
          : 'mb-6 flex h-48 items-end rounded-lg border border-obsidian-700 bg-cover bg-center p-4'
      }
      style={{ backgroundImage: `url(${url})` }}
    >
      {scene && (
        <span className="rounded bg-black/60 px-3 py-1 text-sm font-semibold tracking-wide text-parchment-100">
          {scene.name}
        </span>
      )}
    </div>
  )
}
