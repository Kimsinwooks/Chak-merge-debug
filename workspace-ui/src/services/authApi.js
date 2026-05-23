const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

async function parseJsonSafe(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function request(path, options = {}, fallback = '요청 실패') {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...options,
  })

  const data = await parseJsonSafe(res)

  if (!res.ok) {
    throw new Error(data?.detail || data?.message || fallback)
  }

  return data
}

export async function fetchMe() {
  try {
    return await request('/auth/me', {}, '로그인 상태 확인 실패')
  } catch {
    return null
  }
}

export async function getCurrentUser() {
  return fetchMe()
}

export async function logout() {
  return request(
    '/auth/logout',
    {
      method: 'POST',
    },
    '로그아웃 실패',
  )
}

export async function logoutUser() {
  return logout()
}

export function loginWithGoogle(event) {
  if (event?.preventDefault) event.preventDefault()
  if (event?.stopPropagation) event.stopPropagation()

  window.location.assign(`${API_BASE_URL}/auth/google/login`)
}

export function startGoogleLogin(event) {
  loginWithGoogle(event)
}

export function openGoogleLogin(event) {
  loginWithGoogle(event)
}
