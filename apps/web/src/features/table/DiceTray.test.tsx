import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DiceTray } from './DiceTray.js'

describe('DiceTray', () => {
  it('does nothing when Roll is clicked with nothing queued', async () => {
    const onRoll = vi.fn()
    render(<DiceTray onRoll={onRoll} />)

    expect(screen.getByRole('button', { name: /^Roll/ })).toBeDisabled()
    expect(onRoll).not.toHaveBeenCalled()
  })

  it('queues dice by clicking a die face, then rolls them all at once', async () => {
    const onRoll = vi.fn()
    const user = userEvent.setup()
    render(<DiceTray onRoll={onRoll} />)

    await user.click(screen.getByRole('button', { name: /^d20/ }))
    await user.click(screen.getByRole('button', { name: /^d20/ }))
    await user.click(screen.getByRole('button', { name: /^d6/ }))

    expect(screen.getByRole('button', { name: 'Roll (3)' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Roll (3)' }))

    expect(onRoll).toHaveBeenCalledTimes(1)
    const [label, dice] = onRoll.mock.calls[0]!
    expect(dice).toEqual(
      expect.arrayContaining([
        { sides: 20, count: 2 },
        { sides: 6, count: 1 },
      ]),
    )
    expect(label).toContain('2d20')
  })

  it('clears the queue after rolling', async () => {
    const user = userEvent.setup()
    render(<DiceTray onRoll={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /^d20/ }))
    await user.click(screen.getByRole('button', { name: 'Roll (1)' }))

    expect(screen.getByRole('button', { name: /^Roll/ })).toBeDisabled()
  })

  it('the Clear button empties the queue without rolling', async () => {
    const onRoll = vi.fn()
    const user = userEvent.setup()
    render(<DiceTray onRoll={onRoll} />)

    await user.click(screen.getByRole('button', { name: /^d20/ }))
    await user.click(screen.getByRole('button', { name: 'Clear' }))

    expect(screen.getByRole('button', { name: /^Roll/ })).toBeDisabled()
    expect(onRoll).not.toHaveBeenCalled()
  })
})
