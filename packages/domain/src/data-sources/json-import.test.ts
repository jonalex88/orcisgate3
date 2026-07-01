import { describe, expect, it } from 'vitest'
import { JsonImportDataSource } from './json-import.js'

describe('JsonImportDataSource', () => {
  it('wraps the provided JSON as an ddb-json-import payload without transforming it', async () => {
    const raw = { id: 167672386, name: 'Nathaniel Twinty' }
    const source = new JsonImportDataSource(raw)

    const result = await source.fetchCharacter({ characterId: '167672386' })

    expect(result.source).toBe('ddb-json-import')
    expect(result.data).toBe(raw)
    expect(() => new Date(result.fetchedAt)).not.toThrow()
  })
})
