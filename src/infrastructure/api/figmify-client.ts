import { hasValidApiV1Document, type ApiError, type FigmaDocument } from '../../contracts/api-v1'

export const figmifyApiBaseUrl = 'http://127.0.0.1:3000'

export type FigmifyApiV1Response = FigmaDocument | ApiError

const networkError: ApiError = {
  code: 'NETWORK_ERROR',
  message: 'Unable to reach Figmify API. Please try again.',
}

const incompatibleResponseError: ApiError = {
  code: 'INCOMPATIBLE_RESPONSE',
  message: 'The API response is not compatible with API v1.',
}

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

  let response: Response

  try {
    response = await fetchImplementation(requestUrl.toString(), {
      method: 'GET',
      signal,
    })
  } catch {
    return networkError
  }

  let responseBody: unknown

  try {
    responseBody = await response.json()
  } catch {
    return incompatibleResponseError
  }

  if (isApiError(responseBody)) {
    return responseBody
  }

  return hasValidApiV1Document(responseBody) ? responseBody : incompatibleResponseError
}
