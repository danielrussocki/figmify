import { describe, expect, it, vi } from 'vitest'
import { hasValidApiV1Document, hasValidApiV1Header } from '../../src/contracts/api-v1'
import { requestFigmaDocument } from '../../src/infrastructure/api/figmify-client'
import { apiV1Schema11Fixture } from '../fixtures/api-v1-schema-1.1'

describe('API v1 Figma 1.1 contract', () => {
  it('accepts a GET /v1/figma response with schema version 1.1', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(apiV1Schema11Fixture), { status: 200 }),
    )

    await expect(requestFigmaDocument('https://simplesite.ayra.ch/', undefined, fetchImplementation)).resolves.toEqual(apiV1Schema11Fixture)

    expect(fetchImplementation).toHaveBeenCalledWith(
      'http://localhost:3000/v1/figma?url=https%3A%2F%2Fsimplesite.ayra.ch%2F&includeHidden=false',
      { method: 'GET' },
    )
  })

  it.each(['1.0', '1.2', '2.0'])('rejects unsupported schema version %s', (schemaVersion) => {
    expect(hasValidApiV1Header({ ...apiV1Schema11Fixture, schemaVersion })).toBe(false)
  })

  it('accepts a body frame with an image paint and descendants', () => {
    expect(hasValidApiV1Document(apiV1Schema11Fixture)).toBe(true)

    const body = apiV1Schema11Fixture.document.children[0]
    expect(body).toMatchObject({
      tag: 'body',
      type: 'FRAME',
      fills: [{ type: 'IMAGE', src: 'https://images.example.com/background.jpg', scaleMode: 'FILL' }],
    })
    expect(body.children).toHaveLength(1)
  })
})
