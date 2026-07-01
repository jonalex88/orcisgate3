import type { RollEvent } from '@orcisgate/domain'
import type { Response } from 'express'
import { describe, expect, it, vi } from 'vitest'
import {
  activateEncounter,
  addClient,
  addRoll,
  exitEncounter,
  getOrCreateRoom,
  setMoodImage,
  setShowDmRollsToPlayers,
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
    addClient(room, { res, role: 'player' })

    const events = parseEvents(res)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ type: 'snapshot' })
  })

  it('broadcasts a visible roll to both player and dm clients', () => {
    const room = getOrCreateRoom(`vis-${Math.random()}`)
    const playerRes = fakeClientRes()
    const dmRes = fakeClientRes()
    addClient(room, { res: playerRes, role: 'player' })
    addClient(room, { res: dmRes, role: 'dm' })

    addRoll(room, fakeRoll())

    expect(parseEvents(playerRes)).toHaveLength(2) // snapshot + roll
    expect(parseEvents(dmRes)).toHaveLength(2)
  })

  it('never sends a hidden DM roll to a player client, even though the DM sees it', () => {
    const room = getOrCreateRoom(`hidden-${Math.random()}`)
    const playerRes = fakeClientRes()
    const dmRes = fakeClientRes()
    addClient(room, { res: playerRes, role: 'player' })
    addClient(room, { res: dmRes, role: 'dm' })

    addRoll(room, fakeRoll({ actorRole: 'dm', isHiddenFromPlayers: true }))

    expect(parseEvents(playerRes)).toHaveLength(1) // snapshot only
    expect(parseEvents(dmRes)).toHaveLength(2) // snapshot + roll
  })

  it('reveals hidden DM rolls to players once the DM toggles "show my rolls to the underlings"', () => {
    const room = getOrCreateRoom(`toggle-${Math.random()}`)
    setShowDmRollsToPlayers(room, true)
    const playerRes = fakeClientRes()
    addClient(room, { res: playerRes, role: 'player' })

    addRoll(room, fakeRoll({ actorRole: 'dm', isHiddenFromPlayers: true }))

    expect(parseEvents(playerRes)).toHaveLength(2)
  })

  it('a player joining mid-session never sees a previously hidden roll in their snapshot', () => {
    const room = getOrCreateRoom(`late-${Math.random()}`)
    addRoll(room, fakeRoll({ actorRole: 'dm', isHiddenFromPlayers: true }))

    const playerRes = fakeClientRes()
    addClient(room, { res: playerRes, role: 'player' })

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
    addClient(room, { res, role: 'dm' })

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
    addClient(room, { res, role: 'player' })

    setMoodImage(room, 'https://example.com/tavern.jpg')

    expect(parseEvents(res)[1]).toEqual({ type: 'mood-image', url: 'https://example.com/tavern.jpg' })
  })
})
