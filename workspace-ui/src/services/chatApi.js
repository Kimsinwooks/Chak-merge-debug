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

function normalizeRoomName(roomName, room_name) {
  const resolved = roomName || room_name || ''

  if (!resolved || resolved === 'default_room') {
    throw new Error('룸이 선택되지 않았습니다. 룸에 입장한 뒤 채팅을 사용하세요.')
  }

  return resolved
}

function normalizeTargetType(value) {
  const v = String(value || 'room').toLowerCase()

  if (v === 'team' || v === 'channel' || v === 'room') return 'room'
  if (v === 'dm' || v === 'direct' || v === 'personal') return 'dm'

  return 'room'
}

function normalizeFetchArgs(arg1, arg2, arg3) {
  if (typeof arg1 === 'object' && arg1 !== null) {
    return {
      roomName: arg1.roomName || arg1.room_name,
      targetType: normalizeTargetType(arg1.targetType || arg1.chatType || arg1.chat_type || arg2),
      peerUserId: arg1.peerUserId || arg1.peer_user_id || arg1.dmUserId || arg1.dm_user_id || arg3 || null,
      limit: arg1.limit || 100,
    }
  }

  return {
    roomName: arg1,
    targetType: normalizeTargetType(arg2),
    peerUserId: arg3 || null,
    limit: 100,
  }
}

function normalizeSendArgs(arg1, arg2, arg3, arg4) {
  if (typeof arg1 === 'object' && arg1 !== null) {
    return {
      roomName: arg1.roomName || arg1.room_name,
      content: arg1.content || arg1.message || arg1.text || '',
      targetType: normalizeTargetType(arg1.targetType || arg1.chatType || arg1.chat_type || arg3),
      peerUserId: arg1.peerUserId || arg1.peer_user_id || arg1.dmUserId || arg1.dm_user_id || arg4 || null,
    }
  }

  return {
    roomName: arg1,
    content: arg2 || '',
    targetType: normalizeTargetType(arg3),
    peerUserId: arg4 || null,
  }
}

function normalizeAskArgs(arg1, arg2, arg3, arg4, arg5) {
  if (typeof arg1 === 'object' && arg1 !== null) {
    return {
      roomName: arg1.roomName || arg1.room_name,
      question: arg1.question || arg1.message || arg1.text || '',
      targetType: normalizeTargetType(arg1.targetType || arg1.chatType || arg1.chat_type || arg3),
      peerUserId: arg1.peerUserId || arg1.peer_user_id || arg1.dmUserId || arg1.dm_user_id || arg4 || null,
      useWeb: Boolean(arg1.useWeb),
    }
  }

  return {
    roomName: arg1,
    question: arg2 || '',
    targetType: normalizeTargetType(arg3),
    peerUserId: arg4 || null,
    useWeb: Boolean(arg5),
  }
}

export async function fetchChatMessages(arg1, arg2, arg3) {
  const args = normalizeFetchArgs(arg1, arg2, arg3)
  const resolvedRoomName = normalizeRoomName(args.roomName)

  const query = new URLSearchParams()
  query.set('limit', String(args.limit || 100))
  query.set('targetType', args.targetType || 'room')

  if (args.peerUserId) {
    query.set('peerUserId', args.peerUserId)
  }

  const data = await request(
    `${API_BASE_URL}/chat/rooms/${encodeURIComponent(resolvedRoomName)}/messages?${query.toString()}`,
    {},
    '채팅 메시지를 불러오지 못했습니다.',
  )

  if (Array.isArray(data)) {
    return { messages: data }
  }

  return {
    ...(data || {}),
    messages: data?.messages || data?.items || data?.data || [],
  }
}

export async function sendChatMessage(arg1, arg2, arg3, arg4) {
  const args = normalizeSendArgs(arg1, arg2, arg3, arg4)
  const resolvedRoomName = normalizeRoomName(args.roomName)
  const content = String(args.content || '').trim()

  if (!content) {
    throw new Error('보낼 메시지를 입력하세요.')
  }

  return request(
    `${API_BASE_URL}/chat/rooms/${encodeURIComponent(resolvedRoomName)}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        targetType: args.targetType || 'room',
        peerUserId: args.peerUserId || null,
      }),
    },
    '채팅 메시지 전송 실패',
  )
}

export async function askChatSlm(arg1, arg2, arg3, arg4, arg5) {
  const args = normalizeAskArgs(arg1, arg2, arg3, arg4, arg5)
  const resolvedRoomName = normalizeRoomName(args.roomName)
  const question = String(args.question || '').trim()

  if (!question) {
    throw new Error('질문을 입력하세요.')
  }

  return request(
    `${API_BASE_URL}/chat/rooms/${encodeURIComponent(resolvedRoomName)}/ask`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        targetType: args.targetType || 'room',
        peerUserId: args.peerUserId || null,
        useWeb: Boolean(args.useWeb),
      }),
    },
    '채팅 SLM 응답 실패',
  )
}

export async function askMiniAssistant({
  message,
  roomName,
  sessionId,
  meetingText = '',
  useWeb = false,
  mode = 'general',
  activeView = '',
}) {
  const text = String(message || '').trim()

  if (!text) {
    throw new Error('질문을 입력하세요.')
  }

  const resolvedRoomName = roomName || ''

  if (!resolvedRoomName || resolvedRoomName === 'default_room') {
    throw new Error('룸이 선택되지 않았습니다. 룸에 입장한 뒤 미니 SLM을 사용하세요.')
  }

  const data = await request(
    `${API_BASE_URL}/ai/chat`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: text,
        text,
        meetingText,
        mode,
        useWeb,
        sessionId: sessionId || null,
        roomName: resolvedRoomName,
        purpose: 'floating_mini_assistant',
        meta: {
          useWeb,
          sessionId: sessionId || null,
          roomName: resolvedRoomName,
          activeView,
        },
      }),
    },
    '미니 SLM 응답 실패',
  )

  return {
    answer: data?.answer || data?.message || data?.text || data?.content || '응답이 비어 있습니다.',
    raw: data,
  }
}

export { API_BASE_URL }
