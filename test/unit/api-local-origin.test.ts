import manifest from '../../manifest.json'
import { describe, expect, it } from 'vitest'
import { figmifyApiBaseUrl } from '../../src/infrastructure/api/figmify-client'

describe('local API origin configuration', () => {
  it('keeps the client API origin in the manifest development allowlist', () => {
    const developmentOrigins = manifest.networkAccess.devAllowedDomains.map(
      (domain) => new URL(domain).origin,
    )

    expect(figmifyApiBaseUrl).toBe('http://localhost:3000')
    expect(developmentOrigins).toEqual([new URL(figmifyApiBaseUrl).origin])
  })
})
