import type { ActionItem } from '@orcisgate/domain'
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

describe('ActionHotbar', () => {
  it('shows a placeholder message when there are no actions', () => {
    render(<ActionHotbar actions={[]} onRoll={vi.fn()} />)
    expect(screen.getByText('No actions to show yet.')).toBeInTheDocument()
  })

  it('renders a numbered slot per action, up to 10', () => {
    const actions = Array.from({ length: 12 }, (_, i) => makeAction({ id: `a${i}`, name: `Action ${i}` }))
    render(<ActionHotbar actions={actions} onRoll={vi.fn()} />)
    expect(screen.getAllByRole('button')).toHaveLength(10)
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
})
