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
  it('disables submission until a game key is entered', () => {
    renderAtRoot()
    expect(screen.getByRole('button', { name: 'Sit at the table' })).toBeDisabled()
  })

  it('routes a player to the connect flow by default', async () => {
    const user = userEvent.setup()
    renderAtRoot()

    await user.type(screen.getByLabelText(/magic game key/i), 'bloodwar-tuesdays')
    await user.click(screen.getByRole('button', { name: 'Sit at the table' }))

    expect(await screen.findByText('CONNECT VIEW')).toBeInTheDocument()
  })

  it('routes a checked "I am the Dungeon Master" straight to the DM view', async () => {
    const user = userEvent.setup()
    renderAtRoot()

    await user.type(screen.getByLabelText(/magic game key/i), 'bloodwar-tuesdays')
    await user.click(screen.getByLabelText('I am the Dungeon Master'))
    await user.click(screen.getByRole('button', { name: 'Sit at the table' }))

    expect(await screen.findByText('DM VIEW')).toBeInTheDocument()
  })
})
