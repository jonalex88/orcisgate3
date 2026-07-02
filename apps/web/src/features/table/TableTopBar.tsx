interface TableTopBarProps {
  gameKey: string
  roleLabel: string
  roundNum: number | null
  connected: boolean
}

export function TableTopBar({ gameKey, roleLabel, roundNum, connected }: TableTopBarProps) {
  return (
    <header className="flex items-center justify-between border-b border-obsidian-700 bg-obsidian-900 px-6 py-3">
      <div>
        <h1>
          <img src="/logo.png" alt="OrcisGate" className="h-6 w-auto" />
        </h1>
        <p className="text-xs text-parchment-300">
          Game <span className="text-moss-400">{gameKey}</span> · {roleLabel}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`h-2 w-2 rounded-full ${connected ? 'bg-moss-500' : 'bg-hp-500'}`}
          title={connected ? 'Connected' : 'Disconnected'}
        />
        {roundNum != null && (
          <span className="rounded border border-obsidian-600 px-3 py-1 text-sm text-parchment-100">
            Round {roundNum}
          </span>
        )}
      </div>
    </header>
  )
}
