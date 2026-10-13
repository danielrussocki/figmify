import manifest from '../../manifest.json'
import { describe, expect, it } from 'vitest'

describe('manifest network access', () => {
  it('allows MVP API and public resource domains with approved reasoning', () => {
    expect(manifest.networkAccess).toEqual({
      allowedDomains: ['*'],
      reasoning:
        'Figmify imports web designs and their public image resources from domains returned by API v1.',
      devAllowedDomains: ['http://127.0.0.1:3000'],
    })
  })
})
