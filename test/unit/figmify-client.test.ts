import { describe, expect, it, vi } from 'vitest'
import type { FigmaDocument } from '../../src/contracts/api-v1'
import { requestFigmaDocument } from '../../src/infrastructure/api/figmify-client'

const document: FigmaDocument = {
  schemaVersion: '1.0',
  source: {
    url: 'https://example.com/',
    viewport: {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
    },
  },
  styles: { colors: [], typographies: [] },
  assets: [],
  document: {
    id: 'root',
    tag: 'body',
    type: 'FRAME',
    rect: { x: 0, y: 0, width: 1440, height: 900, top: 0, left: 0 },
    isVisible: true,
    children: [],
  },
}

describe('Figmify API v1 client', () => {
  it('requests the local API with the original URL and forwards the cancellation signal', async () => {
    const controller = new AbortController()
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(document), { status: 200 }),
    )
    const inputUrl = 'not a URL?with=unescaped values'

    await expect(requestFigmaDocument(inputUrl, controller.signal, fetchImplementation)).resolves.toEqual(document)

    expect(fetchImplementation).toHaveBeenCalledOnce()
    expect(fetchImplementation).toHaveBeenCalledWith(
      'http://127.0.0.1:3000/v1/figma?url=not+a+URL%3Fwith%3Dunescaped+values&includeHidden=false',
      {
        method: 'GET',
        signal: controller.signal,
      },
    )
  })

  it('does not send a signal when cancellation is unavailable', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(document), { status: 200 }),
    )

    await expect(requestFigmaDocument('https://example.com/', undefined, fetchImplementation)).resolves.toEqual(document)

    expect(fetchImplementation).toHaveBeenCalledWith(
      'http://127.0.0.1:3000/v1/figma?url=https%3A%2F%2Fexample.com%2F&includeHidden=false',
      { method: 'GET' },
    )
    expect(Object.hasOwn(fetchImplementation.mock.calls[0]?.[1] ?? {}, 'signal')).toBe(false)
  })

  it('returns the API error without a success document', async () => {
    const apiError = {
      code: 'INVALID_URL',
      message: 'The requested URL is invalid.',
    }
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(apiError), { status: 400 }),
    )

    await expect(requestFigmaDocument('https://invalid.example/', new AbortController().signal, fetchImplementation)).resolves.toEqual(apiError)
  })

  it('returns the specified English message without a success document when the API cannot be reached', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Network request failed'))

    const response = await requestFigmaDocument('https://example.com/', new AbortController().signal, fetchImplementation)

    expect(response).not.toHaveProperty('schemaVersion')
    expect(response).toMatchObject({
      message: 'Unable to reach Figmify API. Please try again.',
    })
  })

  it('returns the specified English message without a success document for a nonconforming response', async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ schemaVersion: '2.0' }), { status: 200 }),
    )

    const response = await requestFigmaDocument('https://example.com/', new AbortController().signal, fetchImplementation)

    expect(response).not.toHaveProperty('schemaVersion')
    expect(response).toMatchObject({
      message: 'The API response is not compatible with API v1.',
    })
  })
})
