export interface FetchWithTimeoutOptions extends RequestInit {
  timeoutMs?: number
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  options: FetchWithTimeoutOptions = {},
): Promise<Response> {
  const { timeoutMs = 15000, signal, ...init } = options

  const timeoutController = new AbortController()
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs)

  const onAbort = () => timeoutController.abort()
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeoutId)
      throw new DOMException("Request aborted", "AbortError")
    }
    signal.addEventListener("abort", onAbort, { once: true })
  }

  try {
    return await fetch(input, {
      ...init,
      signal: timeoutController.signal,
    })
  } finally {
    clearTimeout(timeoutId)
    if (signal) {
      signal.removeEventListener("abort", onAbort)
    }
  }
}
