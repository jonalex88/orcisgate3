import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { markAsDm } from '../../lib/dm-flag.js'

type Step = 'key' | 'role'

export function JoinGameScreen() {
  const [step, setStep] = useState<Step>('key')
  const [gameKey, setGameKey] = useState('')
  const navigate = useNavigate()

  function handleKeySubmit(e: FormEvent) {
    e.preventDefault()
    if (!gameKey.trim()) return
    setStep('role')
  }

  function chooseDm() {
    const key = gameKey.trim()
    markAsDm(key)
    navigate(`/game/${encodeURIComponent(key)}/dm`)
  }

  function chooseUnderling() {
    navigate(`/game/${encodeURIComponent(gameKey.trim())}/connect`)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-obsidian-950 p-8">
      <div className="w-full max-w-md rounded-lg border border-obsidian-700 bg-obsidian-800 p-6">
        <h1 className="text-2xl font-semibold text-parchment-100">OrcisGate</h1>

        {step === 'key' && (
          <form onSubmit={handleKeySubmit}>
            <label className="mt-6 block text-sm text-parchment-300" htmlFor="game-key">
              What is the magic game key to sit at the Dungeon Master&apos;s table?
            </label>
            <input
              id="game-key"
              className="mt-2 w-full rounded border border-obsidian-700 bg-obsidian-900 px-3 py-2 text-parchment-100 outline-none focus:border-moss-500"
              placeholder="e.g. bloodwar-tuesdays"
              value={gameKey}
              onChange={(e) => setGameKey(e.target.value)}
              autoFocus
            />

            <button
              type="submit"
              disabled={gameKey.trim().length === 0}
              className="mt-6 w-full rounded bg-moss-500 px-4 py-2 font-medium text-obsidian-950 hover:bg-moss-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue
            </button>
          </form>
        )}

        {step === 'role' && (
          <div>
            <p className="mt-6 text-sm text-parchment-300">
              Joining <span className="text-moss-400">{gameKey.trim()}</span> — are you the Dungeon Master,
              or an underling?
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={chooseDm}
                className="rounded bg-moss-500 px-4 py-3 font-medium text-obsidian-950 hover:bg-moss-400"
              >
                I am the Dungeon Master
              </button>
              <button
                type="button"
                onClick={chooseUnderling}
                className="rounded border border-obsidian-600 px-4 py-3 font-medium text-parchment-100 hover:bg-obsidian-900"
              >
                I am an underling
              </button>
            </div>

            <button
              type="button"
              onClick={() => setStep('key')}
              className="mt-4 text-xs text-parchment-300 hover:text-moss-400"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
