import type { ActionItem, Spell } from '@orcisgate/domain'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ActionHotbar } from './ActionHotbar.js'

function makeAction(overrides: Partial<ActionItem> = {}): ActionItem {
  return {
    id: 'a1',
    name: 'Scimitar',
    description: '<p>Melee Weapon Attack: +5 to hit.</p>',
    economyType: 'action',
    sourceKind: 'monster',
    isManualOverride: false,
    tags: [],
    ...overrides,
  }
}

function makeSpell(overrides: Partial<Spell> = {}): Spell {
  return {
    id: 's1',
    name: 'Healing Word',
    description: '<p>A creature of your choice regains hit points.</p>',
    level: 1,
    school: 'evocation',
    castingEconomy: 'bonusAction',
    range: '60 ft',
    components: { verbal: true, somatic: false, material: false },
    concentration: false,
    ritual: false,
    prepared: true,
    alwaysPrepared: false,
    ...overrides,
  }
}

describe('ActionHotbar', () => {
  it('always shows the four primary action-economy tabs', () => {
    render(<ActionHotbar actions={[]} onRoll={vi.fn()} />)
    expect(screen.getByRole('button', { name: /^Action/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Bonus Action/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Reaction/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Free Action/ })).toBeInTheDocument()
  })

  it('shows a placeholder message when the active category has no options', () => {
    render(<ActionHotbar actions={[]} onRoll={vi.fn()} />)
    expect(screen.getByText('No action options to show yet.')).toBeInTheDocument()
  })

  it('renders an action under its matching economy tab', () => {
    render(<ActionHotbar actions={[makeAction()]} onRoll={vi.fn()} />)
    expect(screen.getByTitle('Scimitar')).toBeInTheDocument()
  })

  it('splits attacks, spells, and other actions within the same category', async () => {
    const actions = [
      makeAction({ id: 'w1', name: 'Longsword', sourceKind: 'weapon', economyType: 'bonusAction' }),
      makeAction({ id: 'f1', name: 'Off-Hand Attack', sourceKind: 'feature', economyType: 'bonusAction' }),
    ]
    const spells = [makeSpell()]
    const user = userEvent.setup()
    render(<ActionHotbar actions={actions} spells={spells} onRoll={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /^Bonus Action/ }))

    expect(screen.getByText('Attacks')).toBeInTheDocument()
    expect(screen.getByTitle('Longsword')).toBeInTheDocument()
    expect(screen.getByText('Spells')).toBeInTheDocument()
    expect(screen.getByTitle('Healing Word')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
    expect(screen.getByTitle('Off-Hand Attack')).toBeInTheDocument()
  })

  it('a bonus-action spell does not show up under the Action tab', () => {
    render(
      <ActionHotbar
        actions={[makeAction()]}
        spells={[makeSpell({ castingEconomy: 'bonusAction' })]}
        onRoll={vi.fn()}
      />,
    )
    // Defaults to the Action tab since it's the first primary economy with any options.
    expect(screen.queryByTitle('Healing Word')).not.toBeInTheDocument()
  })

  it('clicking a slot opens a detail popover with the description, stripped of HTML', async () => {
    const user = userEvent.setup()
    render(<ActionHotbar actions={[makeAction()]} onRoll={vi.fn()} />)

    await user.click(screen.getByTitle('Scimitar'))

    expect(screen.getByText('Melee Weapon Attack: +5 to hit.')).toBeInTheDocument()
  })

  it('clicking "Roll d20" in the popover calls onRoll with the action name', async () => {
    const onRoll = vi.fn()
    const user = userEvent.setup()
    render(<ActionHotbar actions={[makeAction()]} onRoll={onRoll} />)

    await user.click(screen.getByTitle('Scimitar'))
    await user.click(screen.getByRole('button', { name: 'Roll d20' }))

    expect(onRoll).toHaveBeenCalledWith('Scimitar')
  })

  it('pressing the matching number key selects a slot', () => {
    render(<ActionHotbar actions={[makeAction()]} onRoll={vi.fn()} />)

    fireEvent.keyDown(window, { key: '1' })

    expect(screen.getByText('Melee Weapon Attack: +5 to hit.')).toBeInTheDocument()
  })

  it('switching tabs clears the selected slot', async () => {
    const user = userEvent.setup()
    render(<ActionHotbar actions={[makeAction()]} onRoll={vi.fn()} />)

    await user.click(screen.getByTitle('Scimitar'))
    expect(screen.getByText('Melee Weapon Attack: +5 to hit.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Bonus Action/ }))
    expect(screen.queryByText('Melee Weapon Attack: +5 to hit.')).not.toBeInTheDocument()
  })
})
