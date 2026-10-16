export const localApiBaseUrl = 'http://localhost:3000'

const localApiProbeUrl =
  `${localApiBaseUrl}/v1/figma?url=not-a-url&includeHidden=false`
const unavailableApiMessage =
  `Figmify API integration tests require the local API at ${localApiBaseUrl}. Start the API and retry.`
const localApiProbeTimeoutMilliseconds = 1_000

export async function ensureLocalApiAvailable(fetchImplementation: typeof fetch = fetch): Promise<void> {
  let response: Response

  try {
    response = await fetchImplementation(localApiProbeUrl, {
      signal: AbortSignal.timeout(localApiProbeTimeoutMilliseconds),
    })
  } catch {
    throw new Error(unavailableApiMessage)
  }

  if (response.status !== 400) {
    throw new Error(`${unavailableApiMessage} Expected HTTP 400 but received HTTP ${response.status}.`)
  }
}
