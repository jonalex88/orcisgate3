import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router'
import App from './App.js'

describe('App', () => {
  it('renders the join-game screen at the root route', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'OrcisGate' })).toBeInTheDocument()
    expect(screen.getByLabelText(/magic game key/i)).toBeInTheDocument()
  })
})
