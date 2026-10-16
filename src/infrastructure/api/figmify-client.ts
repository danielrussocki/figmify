import { hasValidApiV1Document, type ApiError, type FigmaDocument } from '../../contracts/api-v1'

export const figmifyApiBaseUrl = 'http://localhost:3000'

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

function encodeQueryParameter(value: string): string {
  return encodeURIComponent(value)
    .replace(/%20/g, '+')
    .replace(/[!'()~]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
}

export async function requestFigmaDocument(
  inputUrl: string,
  signal: AbortSignal | undefined,
  fetchImplementation: typeof fetch = fetch,
): Promise<FigmifyApiV1Response> {
  const requestUrl = `${figmifyApiBaseUrl}/v1/figma?url=${encodeQueryParameter(inputUrl)}&includeHidden=false`

  let response: Response
  const requestOptions: { method: 'GET'; signal?: AbortSignal } = { method: 'GET' }
  if (signal !== undefined) {
    requestOptions.signal = signal
  }

  try {
    response = await fetchImplementation(requestUrl, requestOptions)
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
