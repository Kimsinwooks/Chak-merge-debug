const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

async function parseJsonSafe(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

async function request(url, options = {}, fallback = '요청 실패') {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
  })

  const data = await parseJsonSafe(res)

  if (!res.ok) {
    throw new Error(data?.detail || data?.message || fallback)
  }

  return data
}

export async function previewDeleteRoom(roomName) {
  return request(
    `${API_BASE_URL}/rooms/${encodeURIComponent(roomName)}/delete-preview`,
    {},
    '룸 삭제 미리보기 실패',
  )
}

export async function deleteRoom(roomName, options = {}) {
  const query = new URLSearchParams()
  query.set('delete_files', options.deleteFiles === false ? 'false' : 'true')
  query.set('delete_room_row', options.deleteRoomRow === false ? 'false' : 'true')

  return request(
    `${API_BASE_URL}/rooms/${encodeURIComponent(roomName)}?${query.toString()}`,
    {
      method: 'DELETE',
    },
    '룸 삭제 실패',
  )
}
