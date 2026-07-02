import type { ConnectedPlayer, RollEvent } from '@orcisgate/domain'
import type { Response } from 'express'
import { describe, expect, it, vi } from 'vitest'
import {
  activateEncounter,
  addClient,
  addRoll,
  exitEncounter,
  getOrCreateRoom,
  removeClient,
  rollInitiativeForConnectedPlayers,
  setMoodImage,
  setShowDmRollsToPlayers,
  upsertConnectedPlayer,
} from './game-room.js'

function fakeClientRes() {
  return { write: vi.fn() } as unknown as Response
}

function parseEvents(res: Response): unknown[] {
  const write = res.write as unknown as ReturnType<typeof vi.fn>
  return write.mock.calls.map(([chunk]: [string]) => JSON.parse(chunk.replace(/^data: /, '').trim()))
}

function fakeRoll(overrides: Partial<RollEvent> = {}): RollEvent {
  return {
    id: 'roll-1',
    gameKey: 'test-key',
    actorName: 'Test Adventurer',
    actorRole: 'player',
    characterId: '167672386',
    label: 'Attack Roll',
    dice: [{ sides: 20, count: 1 }],
    results: [15],
    total: 15,
    isHiddenFromPlayers: false,
    timestamp: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('game-room', () => {
  const key = `test-${Math.random()}`

  it('creates a room lazily and returns the same instance on repeat calls', () => {
    const a = getOrCreateRoom(key)
    const b = getOrCreateRoom(key)
    expect(a).toBe(b)
  })

  it('sends a snapshot immediately when a client connects', () => {
    const room = getOrCreateRoom(`snap-${Math.random()}`)
    const res = fakeClientRes()
    addClient(room, { res, role: 'player', characterId: null })

    const events = parseEvents(res)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ type: 'snapshot' })
  })

  it('broadcasts a visible roll to both player and dm clients', () => {
    const room = getOrCreateRoom(`vis-${Math.random()}`)
    const playerRes = fakeClientRes()
    const dmRes = fakeClientRes()
    addClient(room, { res: playerRes, role: 'player', characterId: null })
    addClient(room, { res: dmRes, role: 'dm', characterId: null })

    addRoll(room, fakeRoll())

    expect(parseEvents(playerRes)).toHaveLength(2) // snapshot + roll
    expect(parseEvents(dmRes)).toHaveLength(2)
  })

  it('never sends a hidden DM roll to a player client, even though the DM sees it', () => {
    const room = getOrCreateRoom(`hidden-${Math.random()}`)
    const playerRes = fakeClientRes()
    const dmRes = fakeClientRes()
    addClient(room, { res: playerRes, role: 'player', characterId: null })
    addClient(room, { res: dmRes, role: 'dm', characterId: null })

    addRoll(room, fakeRoll({ actorRole: 'dm', isHiddenFromPlayers: true }))

    expect(parseEvents(playerRes)).toHaveLength(1) // snapshot only
    expect(parseEvents(dmRes)).toHaveLength(2) // snapshot + roll
  })

  it('reveals hidden DM rolls to players once the DM toggles "show my rolls to the underlings"', () => {
    const room = getOrCreateRoom(`toggle-${Math.random()}`)
    setShowDmRollsToPlayers(room, true)
    const playerRes = fakeClientRes()
    addClient(room, { res: playerRes, role: 'player', characterId: null })

    addRoll(room, fakeRoll({ actorRole: 'dm', isHiddenFromPlayers: true }))

    expect(parseEvents(playerRes)).toHaveLength(2)
  })

  it('a player joining mid-session never sees a previously hidden roll in their snapshot', () => {
    const room = getOrCreateRoom(`late-${Math.random()}`)
    addRoll(room, fakeRoll({ actorRole: 'dm', isHiddenFromPlayers: true }))

    const playerRes = fakeClientRes()
    addClient(room, { res: playerRes, role: 'player', characterId: null })

    const [snapshotEvent] = parseEvents(playerRes) as [{ snapshot: { rollLog: unknown[] } }]
    expect(snapshotEvent.snapshot.rollLog).toEqual([])
  })

  it('caps the roll log at 200 entries', () => {
    const room = getOrCreateRoom(`cap-${Math.random()}`)
    for (let i = 0; i < 205; i++) addRoll(room, fakeRoll({ id: `roll-${i}` }))
    expect(room.rollLog).toHaveLength(200)
    expect(room.rollLog[0]?.id).toBe('roll-5')
  })

  it('broadcasts encounter activation and exit', () => {
    const room = getOrCreateRoom(`enc-${Math.random()}`)
    const res = fakeClientRes()
    addClient(room, { res, role: 'dm', characterId: null })

    const encounter = { id: 'e1', name: null, monsters: [], groups: [], players: [], roundNum: 1, turnNum: 1 }
    activateEncounter(room, encounter, [])
    exitEncounter(room)

    const events = parseEvents(res)
    expect(events.map((e) => (e as { type: string }).type)).toEqual([
      'snapshot',
      'encounter-activated',
      'encounter-exited',
    ])
  })

  it('broadcasts mood image changes', () => {
    const room = getOrCreateRoom(`mood-${Math.random()}`)
    const res = fakeClientRes()
    addClient(room, { res, role: 'player', characterId: null })

    setMoodImage(room, 'https://example.com/tavern.jpg')

    expect(parseEvents(res)[1]).toEqual({ type: 'mood-image', url: 'https://example.com/tavern.jpg' })
  })

  function fakePlayer(overrides: Partial<ConnectedPlayer> = {}): ConnectedPlayer {
    return {
      characterId: '167672386',
      name: 'Test Adventurer',
      classByLine: 'Warlock / The Hexblade',
      avatarUrl: null,
      initiative: null,
      ...overrides,
    }
  }

  it('adds a connecting player to the roster and broadcasts the update', () => {
    const room = getOrCreateRoom(`roster-${Math.random()}`)
    const dmRes = fakeClientRes()
    addClient(room, { res: dmRes, role: 'dm', characterId: null })

    const playerClient = { res: fakeClientRes(), role: 'player' as const, characterId: '167672386' }
    upsertConnectedPlayer(room, fakePlayer(), playerClient)

    const events = parseEvents(dmRes)
    expect(events[1]).toMatchObject({ type: 'roster-updated', connectedPlayers: [fakePlayer()] })
  })

  it('includes the current roster in a new connection snapshot', () => {
    const room = getOrCreateRoom(`roster-snap-${Math.random()}`)
    const playerClient = { res: fakeClientRes(), role: 'player' as const, characterId: '167672386' }
    upsertConnectedPlayer(room, fakePlayer(), playerClient)

    const dmRes = fakeClientRes()
    addClient(room, { res: dmRes, role: 'dm', characterId: null })

    const [snapshotEvent] = parseEvents(dmRes) as [{ snapshot: { connectedPlayers: ConnectedPlayer[] } }]
    expect(snapshotEvent.snapshot.connectedPlayers).toEqual([fakePlayer()])
  })

  it('removes a player from the roster once the post-disconnect grace period elapses', () => {
    vi.useFakeTimers()
    const room = getOrCreateRoom(`leave-${Math.random()}`)
    const playerClient = { res: fakeClientRes(), role: 'player' as const, characterId: '167672386' }
    upsertConnectedPlayer(room, fakePlayer(), playerClient)

    removeClient(room, playerClient)
    expect(room.connectedPlayers.size).toBe(1) // not evicted immediately

    vi.runAllTimers()
    expect(room.connectedPlayers.size).toBe(0)
    vi.useRealTimers()
  })

  it('cancels the pending removal if the same player reconnects within the grace period', () => {
    vi.useFakeTimers()
    const room = getOrCreateRoom(`regrace-${Math.random()}`)
    const oldClient = { res: fakeClientRes(), role: 'player' as const, characterId: '167672386' }
    upsertConnectedPlayer(room, fakePlayer(), oldClient)

    removeClient(room, oldClient)
    const newClient = { res: fakeClientRes(), role: 'player' as const, characterId: '167672386' }
    upsertConnectedPlayer(room, fakePlayer(), newClient)

    vi.runAllTimers()

    expect(room.connectedPlayers.has('167672386')).toBe(true)
    vi.useRealTimers()
  })

  it('does not evict a player on a stale disconnect after they reconnected first (refresh race)', () => {
    const room = getOrCreateRoom(`race-${Math.random()}`)
    const oldClient = { res: fakeClientRes(), role: 'player' as const, characterId: '167672386' }
    upsertConnectedPlayer(room, fakePlayer(), oldClient)

    // Browser opens the new connection before the old one's close event fires.
    const newClient = { res: fakeClientRes(), role: 'player' as const, characterId: '167672386' }
    upsertConnectedPlayer(room, fakePlayer(), newClient)

    // The stale connection's close handler fires last.
    removeClient(room, oldClient)

    expect(room.connectedPlayers.has('167672386')).toBe(true)
  })

  it('preserves an already-rolled initiative across a player reconnect', () => {
    const room = getOrCreateRoom(`preserve-init-${Math.random()}`)
    const client = { res: fakeClientRes(), role: 'player' as const, characterId: '167672386' }
    upsertConnectedPlayer(room, fakePlayer(), client)
    rollInitiativeForConnectedPlayers(room, () => 17)

    upsertConnectedPlayer(room, fakePlayer({ initiative: null }), client)

    expect(room.connectedPlayers.get('167672386')?.initiative).toBe(17)
  })

  it('rolls initiative for every connected player and broadcasts the roster', () => {
    const room = getOrCreateRoom(`roll-init-${Math.random()}`)
    const dmRes = fakeClientRes()
    addClient(room, { res: dmRes, role: 'dm', characterId: null })

    const clientA = { res: fakeClientRes(), role: 'player' as const, characterId: 'a' }
    const clientB = { res: fakeClientRes(), role: 'player' as const, characterId: 'b' }
    upsertConnectedPlayer(room, fakePlayer({ characterId: 'a' }), clientA)
    upsertConnectedPlayer(room, fakePlayer({ characterId: 'b' }), clientB)

    const result = rollInitiativeForConnectedPlayers(room, () => 12)

    expect(result.every((p) => p.initiative === 12)).toBe(true)
    const events = parseEvents(dmRes)
    expect(events.at(-1)).toMatchObject({ type: 'roster-updated' })
  })
})
