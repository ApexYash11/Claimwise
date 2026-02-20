export interface FetchWithTimeoutOptions extends RequestInit {
  timeoutMs?: number
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  options: FetchWithTimeoutOptions = {},
): Promise<Response> {
  const { timeoutMs = 15000, signal, ...init } = options

  const requestController = new AbortController()
  const abortRequest = (reason?: unknown) => {
    if (!requestController.signal.aborted) {
      requestController.abort(reason)
    }
  }

  const timeoutId = setTimeout(() => {
    abortRequest(new DOMException("Request timeout", "TimeoutError"))
  }, timeoutMs)

  const onExternalAbort = () => {
    abortRequest(signal?.reason ?? new DOMException("Request aborted", "AbortError"))
  }

  if (signal) {
    signal.addEventListener("abort", onExternalAbort, { once: true })
    if (signal.aborted) {
      onExternalAbort()
    }
  }

  try {
    return await fetch(input, {
      ...init,
      signal: requestController.signal,
    })
  } finally {
    clearTimeout(timeoutId)
    if (signal) {
      signal.removeEventListener("abort", onExternalAbort)
    }
  }
}
