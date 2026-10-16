import { describe, expect, it } from 'vitest'
import { ensureLocalApiAvailable, localApiBaseUrl } from './api-local-harness'

const fixtureUrl = 'https://example.com/'

describe('API v1 correct HTTP request', () => {
  it('sends an unauthenticated GET request with the original URL and includeHidden=false', async () => {
    await ensureLocalApiAvailable()

    const requestUrl = new URL('/v1/figma', localApiBaseUrl)
    requestUrl.search = new URLSearchParams({
      url: fixtureUrl,
      includeHidden: 'false',
    }).toString()
    const request = new Request(requestUrl, { method: 'GET' })

    expect(request.method).toBe('GET')
    expect(request.url).toBe(
      'http://localhost:3000/v1/figma?url=https%3A%2F%2Fexample.com%2F&includeHidden=false',
    )
    expect(request.headers.has('authorization')).toBe(false)

    const response = await fetch(request)
    const document: { source?: { url?: unknown } } = await response.json()

    expect(response.status).toBe(200)
    expect(document.source?.url).toBe(fixtureUrl)
  }, 60_000)
})
