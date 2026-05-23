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

function normalizeRoom(row, index = 0) {
  const roomName =
    row?.room_name ||
    row?.roomName ||
    row?.name ||
    row?.title ||
    row?.id ||
    `room_${index + 1}`

  return {
    ...row,
    id: row?.id || roomName,
    room_name: roomName,
    roomName,
    name: roomName,
    title: row?.title || roomName,
    label: row?.label || row?.title || roomName,
  }
}

function normalizeRoomsPayload(data) {
  const raw =
    data?.rooms ||
    data?.channels ||
    data?.items ||
    data?.data ||
    data ||
    []

  if (!Array.isArray(raw)) {
    return { ...(data || {}), rooms: [] }
  }

  return {
    ...(data || {}),
    rooms: raw.map(normalizeRoom),
  }
}

function resolveRoomName(input) {
  return typeof input === 'string'
    ? input
    : input?.roomName || input?.room_name || input?.name || input?.title || ''
}

export async function fetchRooms() {
  try {
    const data = await request('/rooms', {}, '룸 목록을 불러오지 못했습니다.')
    return normalizeRoomsPayload(data)
  } catch (error) {
    console.warn('[fetchRooms] failed:', error)
    return { rooms: [] }
  }
}

export async function createRoom(roomName) {
  const trimmed = String(resolveRoomName(roomName) || '').trim()

  if (!trimmed) {
    throw new Error('룸 이름을 입력하세요.')
  }

  const payload = {
    room_name: trimmed,
    roomName: trimmed,
    name: trimmed,
    title: trimmed,
  }

  const data = await request(
    '/rooms',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    '룸 생성 실패',
  )

  if (data?.room) {
    return {
      ...data,
      room: normalizeRoom(data.room),
    }
  }

  return normalizeRoom(data)
}

export async function fetchRoomSessions(roomName) {
  const resolvedRoomName = resolveRoomName(roomName)

  if (!resolvedRoomName) {
    return { sessions: [] }
  }

  try {
    const data = await request(
      `/rooms/${encodeURIComponent(resolvedRoomName)}/sessions`,
      {},
      '룸 회의 세션을 불러오지 못했습니다.',
    )

    if (Array.isArray(data)) {
      return { sessions: data }
    }

    return {
      ...(data || {}),
      sessions: data?.sessions || data?.items || data?.data || [],
    }
  } catch (error) {
    console.warn('[fetchRoomSessions] failed:', error)
    return { sessions: [] }
  }
}

export async function fetchRoomMembers(roomName) {
  const resolvedRoomName = resolveRoomName(roomName)

  if (!resolvedRoomName) {
    return { members: [] }
  }

  try {
    const data = await request(
      `/rooms/${encodeURIComponent(resolvedRoomName)}/members`,
      {},
      '룸 멤버를 불러오지 못했습니다.',
    )

    if (Array.isArray(data)) {
      return { members: data }
    }

    return {
      ...(data || {}),
      members: data?.members || data?.items || data?.data || [],
    }
  } catch (error) {
    console.warn('[fetchRoomMembers] failed:', error)
    return { members: [] }
  }
}

export async function createInviteLink(roomName) {
  const resolvedRoomName = resolveRoomName(roomName)

  if (!resolvedRoomName) {
    throw new Error('룸 이름이 없습니다.')
  }

  return request(
    `/rooms/${encodeURIComponent(resolvedRoomName)}/invite-link`,
    {
      method: 'POST',
    },
    '초대 링크 생성 실패',
  )
}

export async function fetchInviteInfo(inviteCode) {
  return request(
    `/rooms/invite/${encodeURIComponent(inviteCode)}`,
    {},
    '초대 정보를 불러오지 못했습니다.',
  )
}

export async function acceptInvite(inviteCode) {
  return request(
    '/rooms/invite/accept',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invite_code: inviteCode,
        inviteCode,
      }),
    },
    '초대 수락 실패',
  )
}

export async function fetchChannels() {
  const data = await fetchRooms()
  return data?.rooms || []
}

export async function createChannel(input) {
  const data = await createRoom(input)

  if (data?.room) {
    return normalizeRoom(data.room)
  }

  return normalizeRoom(data)
}

export async function fetchCalendarEvents(roomName, options = {}) {
  const resolvedRoomName = resolveRoomName(roomName)
  const query = new URLSearchParams()

  query.set('scope', options.scope || 'all')
  query.set('week_label', options.weekLabel || options.week_label || 'all')

  if (resolvedRoomName && resolvedRoomName !== 'default_room') {
    query.set('room_name', resolvedRoomName)
  }

  if (options.dateFrom) query.set('date_from', options.dateFrom)
  if (options.dateTo) query.set('date_to', options.dateTo)

  try {
    const data = await request(
      `/todo-calendar/calendar/events?${query.toString()}`,
      {},
      '캘린더 일정을 불러오지 못했습니다.',
    )

    if (Array.isArray(data)) {
      return data
    }

    return data?.events || data?.items || data?.data || []
  } catch (error) {
    console.warn('[fetchCalendarEvents] failed:', error)
    return []
  }
}

export { API_BASE_URL }
