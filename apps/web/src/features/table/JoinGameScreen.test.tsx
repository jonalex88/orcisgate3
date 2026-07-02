import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router'
import { JoinGameScreen } from './JoinGameScreen.js'

function renderAtRoot() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<JoinGameScreen />} />
        <Route path="/game/:gameKey/dm" element={<div>DM VIEW</div>} />
        <Route path="/game/:gameKey/connect" element={<div>CONNECT VIEW</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('JoinGameScreen', () => {
  it('disables continuing until a game key is entered', () => {
    renderAtRoot()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  })

  it('asks whether you are the Dungeon Master or an underling after the key', async () => {
    const user = userEvent.setup()
    renderAtRoot()

    await user.type(screen.getByLabelText(/magic game key/i), 'bloodwar-tuesdays')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByRole('button', { name: 'I am the Dungeon Master' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'I am an underling' })).toBeInTheDocument()
  })

  it('routes an underling to the connect flow', async () => {
    const user = userEvent.setup()
    renderAtRoot()

    await user.type(screen.getByLabelText(/magic game key/i), 'bloodwar-tuesdays')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'I am an underling' }))

    expect(await screen.findByText('CONNECT VIEW')).toBeInTheDocument()
  })

  it('routes the Dungeon Master straight to the DM view, no character needed', async () => {
    const user = userEvent.setup()
    renderAtRoot()

    await user.type(screen.getByLabelText(/magic game key/i), 'bloodwar-tuesdays')
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await user.click(screen.getByRole('button', { name: 'I am the Dungeon Master' }))

    expect(await screen.findByText('DM VIEW')).toBeInTheDocument()
  })
})
