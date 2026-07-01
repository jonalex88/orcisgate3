import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.js'

const sampleRawPayload = {
  data: {
    id: 900000001,
    name: 'Test Adventurer',
    decorations: { avatarUrl: null },
    stats: [1, 2, 3, 4, 5, 6].map((id) => ({ id, value: 10 })),
    bonusStats: [1, 2, 3, 4, 5, 6].map((id) => ({ id, value: null })),
    overrideStats: [1, 2, 3, 4, 5, 6].map((id) => ({ id, value: null })),
    baseHitPoints: 8,
    bonusHitPoints: null,
    overrideHitPoints: null,
    removedHitPoints: 0,
    temporaryHitPoints: 0,
    race: { weightSpeeds: { normal: { walk: 30 } } },
    classes: [{ id: 1, level: 1, isStartingClass: true, definition: { name: 'Fighter' }, subclassDefinition: null, classFeatures: [] }],
    feats: [],
    spellSlots: [],
    pactMagic: [],
    classSpells: [],
    actions: { race: [], class: [], background: null, item: null, feat: [] },
    options: { race: [], class: [], background: null, item: null, feat: [] },
    modifiers: { race: [], class: [], background: [], item: [], feat: [], condition: [] },
  },
}

describe('App', () => {
  beforeEach(() => {
    document.cookie = 'orcisgate_last_character=; max-age=0; path=/'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows the connect screen when no character is remembered', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Connect a character' })).toBeInTheDocument()
  })

  it('connects and renders the fetched character on submit', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => sampleRawPayload }))
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByPlaceholderText(/dndbeyond.com/), '167672386')
    await user.click(screen.getByRole('button', { name: 'Connect' }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Test Adventurer' })).toBeInTheDocument())
  })

  it('shows an error message when the input cannot be parsed as a character id', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByPlaceholderText(/dndbeyond.com/), 'not a url')
    await user.click(screen.getByRole('button', { name: 'Connect' }))

    expect(await screen.findByText(/does not look like/)).toBeInTheDocument()
  })
})
