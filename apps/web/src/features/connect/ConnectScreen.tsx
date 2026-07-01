import { useState } from 'react'

interface ConnectScreenProps {
  initialValue: string
  onConnect: (input: string) => void
  isLoading: boolean
  error: string | null
}

export function ConnectScreen({ initialValue, onConnect, isLoading, error }: ConnectScreenProps) {
  const [value, setValue] = useState(initialValue)

  return (
    <div className="flex min-h-screen items-center justify-center bg-obsidian-950 p-8">
      <form
        className="w-full max-w-md rounded-lg border border-obsidian-700 bg-obsidian-800 p-6"
        onSubmit={(e) => {
          e.preventDefault()
          onConnect(value)
        }}
      >
        <h1 className="text-2xl font-semibold text-parchment-100">Connect a character</h1>
        <p className="mt-2 text-sm text-parchment-300">
          Paste your D&D Beyond character URL or id. This only works for public characters right
          now — private-character connect is a later phase.
        </p>
        <input
          className="mt-4 w-full rounded border border-obsidian-700 bg-obsidian-900 px-3 py-2 text-parchment-100 outline-none focus:border-ember-500"
          placeholder="https://www.dndbeyond.com/characters/167672386"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={isLoading}
        />
        {error && <p className="mt-2 text-sm text-hp-400">{error}</p>}
        <button
          type="submit"
          className="mt-4 w-full rounded bg-ember-500 px-4 py-2 font-medium text-obsidian-950 hover:bg-ember-400 disabled:opacity-50"
          disabled={isLoading || value.trim().length === 0}
        >
          {isLoading ? 'Connecting…' : 'Connect'}
        </button>
      </form>
    </div>
  )
}
