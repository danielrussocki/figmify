import { describe, expect, it } from 'vitest'
import { ensureLocalApiAvailable, localApiBaseUrl } from './api-local-harness'

describe('local API integration harness', () => {
  it('uses the documented local API base URL', () => {
    expect(localApiBaseUrl).toBe('http://localhost:3000')
  })

  it('reports a clear error when the local API cannot be reached', async () => {
    const unavailableFetch: typeof fetch = async () => {
      throw new Error('connect ECONNREFUSED')
    }

    await expect(ensureLocalApiAvailable(unavailableFetch)).rejects.toThrow(
      'Figmify API integration tests require the local API at http://localhost:3000. Start the API and retry.',
    )
  })

  it('can start against the local API', async () => {
    await expect(ensureLocalApiAvailable()).resolves.toBeUndefined()
  })
})
