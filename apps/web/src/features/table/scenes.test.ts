import { describe, expect, it } from 'vitest'
import { findScene, SCENES } from './scenes.js'

describe('findScene', () => {
  it('finds a scene by its url', () => {
    const first = SCENES[0]!
    expect(findScene(first.url)).toEqual(first)
  })

  it('returns null for an unknown or null url', () => {
    expect(findScene('https://example.com/real-image.jpg')).toBeNull()
    expect(findScene(null)).toBeNull()
  })
})
