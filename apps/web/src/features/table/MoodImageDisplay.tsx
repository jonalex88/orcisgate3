import { findScene } from './scenes.js'

interface MoodImageDisplayProps {
  url: string | null
}

export function MoodImageDisplay({ url }: MoodImageDisplayProps) {
  if (!url) return null

  const scene = findScene(url)

  return (
    <div
      className="mb-6 flex h-48 items-end rounded-lg border border-obsidian-700 bg-cover bg-center p-4"
      style={{ backgroundImage: `url(${url})` }}
    >
      {scene && (
        <span className="rounded bg-black/60 px-3 py-1 text-lg font-semibold tracking-wide text-parchment-100">
          {scene.name}
        </span>
      )}
    </div>
  )
}
