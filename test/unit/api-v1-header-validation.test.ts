import { describe, expect, it } from 'vitest'
import { hasValidApiV1Header } from '../../src/contracts/api-v1'

const validHeader = {
  schemaVersion: '1.1',
  source: {},
  document: {},
}

describe('API v1 header validation', () => {
  it('accepts schema version 1.1 with a source and root document', () => {
    expect(hasValidApiV1Header(validHeader)).toBe(true)
  })

  it.each([
    ['schema version is missing', { source: {}, document: {} }],
    ['schema version is unsupported', { ...validHeader, schemaVersion: '2.0' }],
    ['source is missing', { schemaVersion: '1.1', document: {} }],
    ['root document is missing', { schemaVersion: '1.1', source: {} }],
  ])('rejects a header when %s', (_description, value) => {
    expect(hasValidApiV1Header(value)).toBe(false)
  })
})
