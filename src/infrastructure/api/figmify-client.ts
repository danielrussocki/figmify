import type { ApiError, FigmaDocument } from '../../contracts/api-v1'

export const figmifyApiBaseUrl = 'http://127.0.0.1:3000'

export type FigmifyApiV1Response = FigmaDocument | ApiError

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    typeof value.code === 'string' &&
    typeof value.message === 'string'
  )
}

export async function requestFigmaDocument(
  inputUrl: string,
  signal: AbortSignal,
  fetchImplementation: typeof fetch = fetch,
): Promise<FigmifyApiV1Response> {
  const requestUrl = new URL('/v1/figma', figmifyApiBaseUrl)
  requestUrl.search = new URLSearchParams({
    url: inputUrl,
    includeHidden: 'false',
  }).toString()

  const response = await fetchImplementation(requestUrl.toString(), {
    method: 'GET',
    signal,
  })
  const responseBody: unknown = await response.json()

  if (isApiError(responseBody)) {
    return responseBody
  }

  return responseBody as FigmaDocument
}
