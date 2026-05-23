import React, { useEffect, useState } from 'react'
import {
  Copy,
  DoorOpen,
  Home,
  Link as LinkIcon,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from 'lucide-react'
import {
  createInviteLink,
  createRoom,
  fetchRoomMembers,
  fetchRooms,
} from '../services/roomApi'
import { deleteRoom, previewDeleteRoom } from '../services/roomAdminApi'

export default function RoomSelector({ onBackHome, onSelectRoom }) {
  const [rooms, setRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [members, setMembers] = useState([])
  const [newRoomName, setNewRoomName] = useState('')
  const [inviteUrl, setInviteUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [memberLoading, setMemberLoading] = useState(false)
  const [deletingRoomName, setDeletingRoomName] = useState('')
  const [message, setMessage] = useState('')

  const getRoomName = (room) => {
    return room?.roomName || room?.room_name || room?.name || ''
  }

  const getCreatedAt = (room) => {
    return room?.createdAt || room?.created_at || '-'
  }

  const getOwnerUserId = (room) => {
    return room?.ownerUserId || room?.owner_user_id || room?.owner || '-'
  }

  const loadRooms = async () => {
    try {
      setLoading(true)
      setMessage('')

      const data = await fetchRooms()
      const nextRooms = (data?.rooms || data?.items || data?.data || (Array.isArray(data) ? data : [])) || []

      setRooms(nextRooms)

      if (!selectedRoom && nextRooms.length > 0) {
        setSelectedRoom(nextRooms[0])
      }

      if (selectedRoom) {
        const selectedName = getRoomName(selectedRoom)
        const stillExists = nextRooms.find((room) => getRoomName(room) === selectedName)

        if (!stillExists) {
          setSelectedRoom(nextRooms[0] || null)
          setMembers([])
          setInviteUrl('')
        }
      }
    } catch (err) {
      console.error(err)
      setMessage(err.message || '룸 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadMembers = async (roomName) => {
    if (!roomName) return

    try {
      setMemberLoading(true)
      const data = await fetchRoomMembers(roomName)
      setMembers(data.members || [])
    } catch (err) {
      console.error(err)
      setMembers([])
      setMessage(err.message || '멤버 목록을 불러오지 못했습니다.')
    } finally {
      setMemberLoading(false)
    }
  }

  const handleCreateRoom = async () => {
    const roomName = newRoomName.trim()

    if (!roomName) {
      setMessage('룸 이름을 입력하세요.')
      return
    }

    try {
      setLoading(true)
      setMessage('')

      const created = await createRoom(roomName)

      setNewRoomName('')
      setSelectedRoom(created)
      setInviteUrl('')
      setMessage('룸이 생성되었습니다.')

      await loadRooms()
      await loadMembers(created.roomName || created.room_name || roomName)
    } catch (err) {
      console.error(err)
      setMessage(err.message || '룸 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectRoom = async (room) => {
    const roomName = getRoomName(room)

    setSelectedRoom(room)
    setInviteUrl('')
    setMessage('')

    await loadMembers(roomName)
  }

  const handleCreateInvite = async () => {
    const roomName = getRoomName(selectedRoom)

    if (!roomName) {
      setMessage('먼저 룸을 선택하세요.')
      return
    }

    try {
      setMessage('')
      const data = await createInviteLink(roomName)
      setInviteUrl(data.inviteUrl || data.invite_url || '')
      setMessage('초대 링크가 생성되었습니다.')
    } catch (err) {
      console.error(err)
      setMessage(err.message || '초대 링크 생성에 실패했습니다.')
    }
  }

  const handleCopyInvite = async () => {
    if (!inviteUrl) return

    try {
      await navigator.clipboard.writeText(inviteUrl)
      setMessage('초대 링크를 복사했습니다.')
    } catch {
      setMessage('복사에 실패했습니다. 링크를 직접 선택해서 복사하세요.')
    }
  }

  const handleDeleteRoom = async (room) => {
    const roomName = getRoomName(room)

    if (!roomName) {
      setMessage('삭제할 룸 이름을 찾을 수 없습니다.')
      return
    }

    if (roomName === 'default_room') {
      setMessage('default_room은 삭제할 수 없습니다.')
      return
    }

    try {
      setDeletingRoomName(roomName)
      setMessage('')

      const preview = await previewDeleteRoom(roomName)
      const counts = preview.counts || {}

      const ok = window.confirm(
        `"${roomName}" 룸을 삭제할까요?\n\n` +
          `삭제될 데이터:\n` +
          `- 회의 세션: ${counts.meetingSessions || 0}개\n` +
          `- 자료 항목: ${counts.libraryItems || 0}개\n` +
          `- 분석 캐시: ${counts.meetingReportCache || 0}개\n` +
          `- To-Do: ${counts.todoItems || 0}개\n` +
          `- 캘린더 일정: ${counts.calendarEvents || 0}개\n` +
          `- STT 라인: ${counts.transcriptLines || 0}개\n` +
          `- 멤버: ${counts.roomMembers || 0}명\n\n` +
          `룸 안의 파일과 데이터가 함께 삭제됩니다.\n` +
          `이 작업은 되돌릴 수 없습니다.`,
      )

      if (!ok) return

      await deleteRoom(roomName, {
        deleteFiles: true,
        deleteRoomRow: true,
      })

      setMessage(`"${roomName}" 룸이 삭제되었습니다.`)

      const selectedName = getRoomName(selectedRoom)

      if (selectedName === roomName) {
        setSelectedRoom(null)
        setMembers([])
        setInviteUrl('')
      }

      await loadRooms()
    } catch (err) {
      console.error(err)
      setMessage(err.message || '룸 삭제 실패')
    } finally {
      setDeletingRoomName('')
    }
  }

  useEffect(() => {
    loadRooms()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const roomName = getRoomName(selectedRoom)

    if (roomName) {
      loadMembers(roomName)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom?.roomName, selectedRoom?.room_name, selectedRoom?.name])

  return (
    <div className="min-h-screen bg-slate-950 text-white px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-black">룸 선택</h1>
            <p className="text-slate-400 mt-2">
              Discord처럼 룸을 만들고, 멤버를 초대하고, 회의 워크스페이스로 들어갑니다.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadRooms}
              disabled={loading}
              className="px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 font-bold flex items-center gap-2 hover:bg-slate-700 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              새로고침
            </button>

            <button
              onClick={onBackHome}
              className="px-4 py-3 rounded-2xl bg-white text-slate-900 font-bold flex items-center gap-2 hover:bg-slate-100"
            >
              <Home className="w-4 h-4" />
              홈으로
            </button>
          </div>
        </header>

        {message && (
          <div className="mb-5 rounded-2xl bg-blue-500/10 border border-blue-400/30 text-blue-100 px-4 py-3 text-sm whitespace-pre-wrap">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
          <aside className="rounded-3xl bg-slate-900 border border-slate-800 p-5">
            <h2 className="text-lg font-black mb-4">새 룸 생성</h2>

            <div className="flex gap-2">
              <input
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="예: 캡스톤프로젝트"
                className="min-w-0 flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateRoom()
                }}
              />

              <button
                onClick={handleCreateRoom}
                disabled={loading}
                className="px-4 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700 disabled:opacity-50"
                title="새 룸 생성"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
              </button>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <h2 className="text-lg font-black">참여 중인 룸</h2>
              <span className="text-xs text-slate-400">{(rooms || []).length}개</span>
            </div>

            <div className="mt-3 space-y-2">
              {loading && (
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 text-slate-400">
                  불러오는 중...
                </div>
              )}

              {!loading && (rooms || []).length === 0 && (
                <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 text-slate-400">
                  아직 참여 중인 룸이 없습니다.
                </div>
              )}

              {(rooms || []).map((room) => {
                const roomName = getRoomName(room)
                const active = getRoomName(selectedRoom) === roomName
                const isDeleting = deletingRoomName === roomName

                return (
                  <div
                    key={room.id || roomName}
                    className={`rounded-2xl border transition ${
                      active
                        ? 'bg-blue-600 border-blue-400 text-white'
                        : 'bg-slate-950 border-slate-800 hover:border-blue-500'
                    }`}
                  >
                    <button
                      onClick={() => handleSelectRoom(room)}
                      className="w-full p-4 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <DoorOpen className="w-4 h-4" />
                        <div className="font-black truncate">{roomName}</div>
                      </div>

                      <div className={`mt-2 text-xs ${active ? 'text-blue-100' : 'text-slate-500'}`}>
                        권한: {room.role || '-'} · 생성일: {getCreatedAt(room)}
                      </div>
                    </button>

                    <div className="px-4 pb-4 flex items-center justify-between gap-2">
                      <button
                        onClick={() => onSelectRoom(roomName)}
                        className={`px-3 py-2 rounded-xl text-xs font-black ${
                          active
                            ? 'bg-white text-blue-700 hover:bg-blue-50'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        입장
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteRoom(room)
                        }}
                        disabled={isDeleting}
                        className={`px-3 py-2 rounded-xl text-xs font-black inline-flex items-center gap-1 disabled:opacity-50 ${
                          active
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-red-500/10 text-red-300 hover:bg-red-500/20'
                        }`}
                      >
                        {isDeleting ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        삭제
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </aside>

          <main className="rounded-3xl bg-white text-slate-900 p-6 shadow-2xl min-h-[600px]">
            {!selectedRoom ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                왼쪽에서 룸을 선택하거나 새 룸을 생성하세요.
              </div>
            ) : (
              <div>
                <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <div className="text-sm text-slate-500">선택된 룸</div>
                    <h2 className="text-3xl font-black mt-1">
                      {getRoomName(selectedRoom)}
                    </h2>
                    <div className="mt-2 text-sm text-slate-500">
                      role: {selectedRoom.role || '-'} · owner: {getOwnerUserId(selectedRoom)}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onSelectRoom(getRoomName(selectedRoom))}
                      className="px-5 py-3 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700"
                    >
                      워크스페이스 입장
                    </button>

                    <button
                      onClick={handleCreateInvite}
                      className="px-5 py-3 rounded-2xl bg-slate-100 text-slate-800 font-bold flex items-center gap-2 hover:bg-slate-200"
                    >
                      <LinkIcon className="w-4 h-4" />
                      초대 링크 생성
                    </button>

                    <button
                      onClick={() => handleDeleteRoom(selectedRoom)}
                      disabled={deletingRoomName === getRoomName(selectedRoom)}
                      className="px-5 py-3 rounded-2xl bg-red-50 text-red-600 font-bold flex items-center gap-2 hover:bg-red-100 disabled:opacity-50"
                    >
                      {deletingRoomName === getRoomName(selectedRoom) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      룸 삭제
                    </button>
                  </div>
                </div>

                {inviteUrl && (
                  <div className="mt-5 rounded-2xl bg-blue-50 border border-blue-100 p-4">
                    <div className="text-sm font-black text-blue-900">초대 링크</div>
                    <div className="mt-2 flex flex-col md:flex-row gap-2">
                      <input
                        value={inviteUrl}
                        readOnly
                        className="flex-1 rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-700"
                      />

                      <button
                        onClick={handleCopyInvite}
                        className="px-4 py-3 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        복사
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-blue-700">
                      이 링크를 카카오톡으로 보내면 상대가 Google 로그인 후 룸에 참여할 수 있습니다.
                    </p>
                  </div>
                )}

                <section className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-black flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      룸 멤버
                    </h3>

                    <button
                      onClick={() => loadMembers(getRoomName(selectedRoom))}
                      className="text-sm px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50"
                    >
                      멤버 새로고침
                    </button>
                  </div>

                  {memberLoading ? (
                    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 text-slate-500">
                      멤버 불러오는 중...
                    </div>
                  ) : members.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 text-slate-500">
                      표시할 멤버가 없습니다.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {members.map((member) => (
                        <div
                          key={member.userId || member.user_id || member.email}
                          className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-center gap-3"
                        >
                          {member.picture ? (
                            <img
                              src={member.picture}
                              alt={member.name || 'member'}
                              className="w-11 h-11 rounded-2xl"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-700 font-black flex items-center justify-center">
                              {member.name?.[0] || member.email?.[0] || 'U'}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="font-black truncate">
                              {member.name || member.email || member.userId || member.user_id}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                              {member.email || member.userId || member.user_id}
                            </div>
                            <div className="text-xs text-blue-600 font-bold mt-1">
                              {member.role || 'member'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="mt-8 rounded-2xl bg-slate-50 border border-slate-100 p-5">
                  <h3 className="font-black">다음 개발 예정</h3>
                  <p className="mt-2 text-sm text-slate-500 leading-6">
                    이 룸 안에 채널 채팅, 개인 DM, SLM 질문/요약/피드백 기능을 붙일 예정입니다.
                    먼저 룸/초대/멤버 구조가 정상 동작하는지 확인한 뒤 채팅 DB와 API를 추가하는 순서가 안전합니다.
                  </p>
                </section>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}