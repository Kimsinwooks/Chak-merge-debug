import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, RefreshCw, Send, Users } from 'lucide-react'
import { askChatSlm, fetchChatMessages, sendChatMessage } from '../services/chatApi'
import { fetchRoomMembers } from '../services/roomApi'

export default function RoomChat({ roomName }) {
  const [members, setMembers] = useState([])
  const [messages, setMessages] = useState([])
  const [targetType, setTargetType] = useState('room')
  const [peerUserId, setPeerUserId] = useState('')
  const [input, setInput] = useState('')
  const [question, setQuestion] = useState('이 채팅 내용을 요약하고 결정사항과 해야 할 일을 정리해줘.')
  const [aiAnswer, setAiAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const bottomRef = useRef(null)

  const selectedPeer = useMemo(() => {
    return members.find((m) => m.userId === peerUserId)
  }, [members, peerUserId])

  const loadMembers = async () => {
    if (!roomName) return

    try {
      const data = await fetchRoomMembers(roomName)
      setMembers(data.members || [])
    } catch (err) {
      setNotice(err.message || '멤버 목록을 불러오지 못했습니다.')
    }
  }

  const loadMessages = async () => {
    if (!roomName) return

    if (targetType === 'dm' && !peerUserId) {
      setMessages([])
      return
    }

    try {
      setLoading(true)
      setNotice('')
      const data = await fetchChatMessages(roomName, targetType, peerUserId || null)
      setMessages(data.messages || [])
    } catch (err) {
      setNotice(err.message || '채팅을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    const content = input.trim()
    if (!content) return

    if (targetType === 'dm' && !peerUserId) {
      setNotice('개인 DM을 보낼 상대를 선택하세요.')
      return
    }

    try {
      setInput('')
      await sendChatMessage(roomName, content, targetType, peerUserId || null)
      await loadMessages()
    } catch (err) {
      setNotice(err.message || '메시지 전송에 실패했습니다.')
    }
  }

  const handleAskAi = async () => {
    if (targetType === 'dm' && !peerUserId) {
      setNotice('분석할 개인 DM 상대를 선택하세요.')
      return
    }

    try {
      setAiLoading(true)
      setAiAnswer('')
      setNotice('')
      const data = await askChatSlm(roomName, question, targetType, peerUserId || null)
      setAiAnswer(data.answer || '')
    } catch (err) {
      setNotice(err.message || 'SLM 분석에 실패했습니다.')
    } finally {
      setAiLoading(false)
    }
  }

  useEffect(() => {
    loadMembers()
  }, [roomName])

  useEffect(() => {
    loadMessages()
  }, [roomName, targetType, peerUserId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  return (
    <div className="h-[calc(100vh-80px)] bg-gray-50 flex">
      <aside className="w-72 border-r border-gray-200 bg-white p-4 flex flex-col">
        <div className="font-black text-xl mb-1">채팅</div>
        <div className="text-sm text-gray-500 mb-4">현재 룸: {roomName}</div>

        <button
          onClick={() => {
            setTargetType('room')
            setPeerUserId('')
            setAiAnswer('')
          }}
          className={`w-full flex items-center gap-2 rounded-2xl px-4 py-3 font-bold mb-2 ${
            targetType === 'room'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Users className="w-4 h-4" />
          팀 채팅
        </button>

        <div className="mt-4 mb-2 text-xs font-black text-gray-400 uppercase">
          개인 DM
        </div>

        <div className="space-y-2 overflow-y-auto">
          {members.map((member) => (
            <button
              key={member.userId}
              onClick={() => {
                setTargetType('dm')
                setPeerUserId(member.userId)
                setAiAnswer('')
              }}
              className={`w-full rounded-2xl px-3 py-3 text-left flex items-center gap-3 ${
                targetType === 'dm' && peerUserId === member.userId
                  ? 'bg-blue-50 border border-blue-200'
                  : 'bg-white border border-gray-100 hover:bg-gray-50'
              }`}
            >
              {member.picture ? (
                <img
                  src={member.picture}
                  alt={member.name || 'member'}
                  className="w-9 h-9 rounded-xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
                  {member.name?.[0] || 'U'}
                </div>
              )}

              <div className="min-w-0">
                <div className="font-bold text-sm truncate">
                  {member.name || member.email || member.userId}
                </div>
                <div className="text-xs text-gray-400 truncate">
                  {member.role || 'member'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="h-20 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">
              {targetType === 'room' ? '팀 채팅' : '개인 DM'}
            </div>
            <div className="font-black text-xl">
              {targetType === 'room'
                ? `# ${roomName}`
                : selectedPeer?.name || selectedPeer?.email || '상대 선택 필요'}
            </div>
          </div>

          <button
            onClick={loadMessages}
            className="px-4 py-2 rounded-xl border border-gray-200 font-bold flex items-center gap-2 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>
        </header>

        {notice && (
          <div className="mx-6 mt-4 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 px-4 py-3 text-sm">
            {notice}
          </div>
        )}

        <section className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="text-gray-400">채팅 불러오는 중...</div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              아직 메시지가 없습니다.
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-3">
                {msg.senderPicture ? (
                  <img
                    src={msg.senderPicture}
                    alt={msg.senderName || 'user'}
                    className="w-10 h-10 rounded-2xl"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-gray-200 flex items-center justify-center font-black">
                    {(msg.senderName || msg.senderEmail || 'U')[0]}
                  </div>
                )}

                <div className="max-w-3xl">
                  <div className="flex items-baseline gap-2">
                    <span className="font-black text-gray-900">
                      {msg.senderName || msg.senderEmail || msg.senderUserId}
                    </span>
                    <span className="text-xs text-gray-400">
                      {msg.createdAt?.replace('T', ' ').slice(0, 19)}
                    </span>
                  </div>
                  <div className="mt-1 rounded-2xl bg-white border border-gray-100 px-4 py-3 text-gray-800 whitespace-pre-wrap shadow-sm">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))
          )}

          <div ref={bottomRef} />
        </section>

        <section className="border-t border-gray-200 bg-white p-4">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                targetType === 'room'
                  ? '팀 채팅 메시지를 입력하세요.'
                  : '개인 DM 메시지를 입력하세요.'
              }
              className="flex-1 min-h-[52px] max-h-32 rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500 resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
            />

            <button
              onClick={handleSend}
              className="w-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 rounded-2xl bg-gray-50 border border-gray-100 p-4">
            <div className="flex items-center gap-2 font-black mb-2">
              <Bot className="w-5 h-5 text-blue-600" />
              SLM에게 이 채팅 물어보기
            </div>

            <div className="flex flex-col lg:flex-row gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500"
                placeholder="예: 이 채팅의 할 일을 정리해줘"
              />
              <button
                onClick={handleAskAi}
                disabled={aiLoading}
                className="px-5 py-3 rounded-xl bg-slate-900 text-white font-black disabled:opacity-50"
              >
                {aiLoading ? '분석 중...' : '질문'}
              </button>
            </div>

            {aiAnswer && (
              <div className="mt-3 rounded-xl bg-white border border-gray-100 p-4 whitespace-pre-wrap text-sm leading-6">
                {aiAnswer}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
