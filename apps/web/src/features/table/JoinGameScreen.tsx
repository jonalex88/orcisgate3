import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { markAsDm } from '../../lib/dm-flag.js'

export function JoinGameScreen() {
  const [gameKey, setGameKey] = useState('')
  const [isDm, setIsDm] = useState(false)
  const navigate = useNavigate()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const key = gameKey.trim()
    if (!key) return
    if (isDm) {
      markAsDm(key)
      navigate(`/game/${encodeURIComponent(key)}/dm`)
    } else {
      navigate(`/game/${encodeURIComponent(key)}/connect`)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-obsidian-950 p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg border border-obsidian-700 bg-obsidian-800 p-6">
        <h1 className="text-2xl font-semibold text-parchment-100">OrcisGate</h1>

        <div className="mt-4 rounded border border-obsidian-600 bg-obsidian-900 p-3 text-xs text-parchment-300">
          <strong className="text-moss-400">Tip:</strong> for a live connection, your D&D Beyond character
          needs to be set to public. On your character's D&D Beyond page, open Settings → Privacy and set
          visibility to Public. You can still paste your character's JSON directly if you'd rather keep it
          private.
        </div>

        <label className="mt-6 block text-sm text-parchment-300" htmlFor="game-key">
          What is the magic game key to sit at the Dungeon Master&apos;s table?
        </label>
        <input
          id="game-key"
          className="mt-2 w-full rounded border border-obsidian-700 bg-obsidian-900 px-3 py-2 text-parchment-100 outline-none focus:border-moss-500"
          placeholder="e.g. bloodwar-tuesdays"
          value={gameKey}
          onChange={(e) => setGameKey(e.target.value)}
        />

        <label className="mt-4 flex items-center gap-2 text-sm text-parchment-300">
          <input
            type="checkbox"
            checked={isDm}
            onChange={(e) => setIsDm(e.target.checked)}
            className="h-4 w-4 accent-moss-500"
          />
          I am the Dungeon Master
        </label>

        <button
          type="submit"
          disabled={gameKey.trim().length === 0}
          className="mt-6 w-full rounded bg-moss-500 px-4 py-2 font-medium text-obsidian-950 hover:bg-moss-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Sit at the table
        </button>
      </form>
    </div>
  )
}
