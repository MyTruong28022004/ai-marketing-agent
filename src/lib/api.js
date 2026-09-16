const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

let accessToken = null
let refreshPromise = null

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export function setAccessToken(token) {
  accessToken = token || null
}

async function parseResponse(response) {
  if (response.status === 204) return null
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return response.text()
  return response.json()
}

function errorFrom(response, data) {
  const rawMessage = data?.message || data?.error || `Yêu cầu thất bại (${response.status})`
  const message = Array.isArray(rawMessage) ? rawMessage.join('. ') : rawMessage
  return new ApiError(message, response.status, data)
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (response) => {
        const data = await parseResponse(response)
        if (!response.ok) throw errorFrom(response, data)
        setAccessToken(data.accessToken)
        return data
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

export async function apiRequest(path, options = {}, retry = true) {
  const headers = new Headers(options.headers || {})
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })
  const data = await parseResponse(response)

  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    await refreshAccessToken()
    return apiRequest(path, options, false)
  }
  if (!response.ok) throw errorFrom(response, data)
  return data
}

export async function restoreSession() {
  return refreshAccessToken()
}

export { API_BASE_URL }
