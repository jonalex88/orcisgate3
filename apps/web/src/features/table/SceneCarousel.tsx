import { SCENES } from './scenes.js'

interface SceneCarouselProps {
  moodImageUrl: string | null
  onSelect: (url: string) => void
}

export function SceneCarousel({ moodImageUrl, onSelect }: SceneCarouselProps) {
  return (
    <div className="border-t border-obsidian-700 bg-obsidian-900 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-moss-400">Scenes · Broadcast to Party</h3>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {SCENES.map((scene) => (
          <button
            key={scene.id}
            type="button"
            onClick={() => onSelect(scene.url)}
            className={`relative h-16 w-28 shrink-0 overflow-hidden rounded-lg border-2 bg-cover bg-center text-left ${
              moodImageUrl === scene.url ? 'border-moss-500' : 'border-obsidian-700'
            }`}
            style={{ backgroundImage: `url(${scene.url})` }}
          >
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1 pt-3 text-[10px] font-medium uppercase tracking-wide text-parchment-100">
              {scene.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
