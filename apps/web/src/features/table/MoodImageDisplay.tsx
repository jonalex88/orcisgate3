import { findScene } from './scenes.js'

interface MoodImageDisplayProps {
  url: string | null
}

export function MoodImageDisplay({ url }: MoodImageDisplayProps) {
  if (!url) return null

  const scene = findScene(url)

  return (
    <div
      className={`mb-6 flex h-40 items-end rounded-lg border border-obsidian-700 bg-gradient-to-br p-4 ${scene?.gradient ?? 'from-obsidian-800 to-obsidian-900'}`}
      style={scene ? undefined : { backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {scene && <span className="text-lg font-semibold tracking-wide text-parchment-100">{scene.name}</span>}
    </div>
  )
}
