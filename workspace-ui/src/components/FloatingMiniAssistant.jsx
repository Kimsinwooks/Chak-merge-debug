import React, { useMemo, useRef, useState } from 'react'
import {
  Bot,
  ChevronDown,
  Loader2,
  MessageCircle,
  Send,
  Sparkles,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react'
import { askMiniAssistant } from '../services/chatApi'

export default function FloatingMiniAssistant({
  roomName,
  sessionId,
  activeView,
  enabled = true,
}) {
  const [open, setOpen] = useState(false)
  const [useWeb, setUseWeb] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState(() => [
    {
      role: 'assistant',
      text: '현재 방 기준으로 질문할 수 있어요. 회의 내용, 업로드 문서, 웹검색을 같이 참고할 수 있습니다.',
    },
  ])
  const [loading, setLoading] = useState(false)

  const scrollRef = useRef(null)

  const resolvedRoomName = roomName || 'default_room'

  const title = useMemo(() => {
    if (sessionId) return `SLM · ${resolvedRoomName}`
    return `SLM · ${resolvedRoomName}`
  }, [resolvedRoomName, sessionId])

  if (!enabled || !roomName) return null

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }, 30)
  }

  const handleSubmit = async () => {
    const question = input.trim()
    if (!question || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: question }])
    setLoading(true)
    scrollToBottom()

    try {
      const result = await askMiniAssistant({
        message: question,
        roomName: resolvedRoomName,
        sessionId,
        useWeb,
        activeView,
      })

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: result.answer,
        },
      ])
    } catch (error) {
      console.error(error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `AI 응답 오류: ${error.message || '응답 생성 실패'}`,
          error: true,
        },
      ])
    } finally {
      setLoading(false)
      scrollToBottom()
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="fixed left-5 bottom-5 z-[80]">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-16 h-16 rounded-3xl bg-slate-950 text-white shadow-2xl flex items-center justify-center hover:bg-slate-800 transition"
          title="미니 SLM 열기"
        >
          <MessageCircle className="w-7 h-7" />
        </button>
      ) : (
        <div className="w-[360px] h-[520px] rounded-3xl bg-white border border-gray-200 shadow-2xl overflow-hidden flex flex-col">
          <header className="h-16 px-4 bg-slate-950 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-black truncate">{title}</div>
                <div className="text-xs text-slate-300 truncate">
                  {sessionId ? `sessionId=${sessionId}` : '회의 세션 미선택'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center"
                title="접기"
              >
                <ChevronDown className="w-5 h-5" />
              </button>

              <button
                onClick={() => {
                  setOpen(false)
                  setMessages([
                    {
                      role: 'assistant',
                      text: '현재 방 기준으로 질문할 수 있어요. 회의 내용, 업로드 문서, 웹검색을 같이 참고할 수 있습니다.',
                    },
                  ])
                }}
                className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center"
                title="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <button
              onClick={() => setUseWeb((prev) => !prev)}
              className={`px-3 py-2 rounded-xl text-xs font-black inline-flex items-center gap-2 ${
                useWeb
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              {useWeb ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              웹검색 {useWeb ? 'ON' : 'OFF'}
            </button>

            <div className="text-xs text-gray-500">
              qwen2.5:3b
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-white"
          >
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user'

              return (
                <div
                  key={`${msg.role}-${idx}`}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap ${
                      isUser
                        ? 'bg-blue-600 text-white'
                        : msg.error
                          ? 'bg-red-50 text-red-700 border border-red-100'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center gap-1 mb-1 text-xs font-black opacity-70">
                        <Sparkles className="w-3 h-3" />
                        어시스턴트
                      </div>
                    )}
                    {msg.text}
                  </div>
                </div>
              )
            })}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-600 inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  답변 생성 중...
                </div>
              </div>
            )}
          </div>

          <footer className="p-3 border-t border-gray-200 bg-white shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="방 안 SLM에게 질문하세요"
                className="flex-1 h-12 max-h-28 resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
              />

              <button
                onClick={handleSubmit}
                disabled={loading || !input.trim()}
                className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </footer>
        </div>
      )}
    </div>
  )
}
