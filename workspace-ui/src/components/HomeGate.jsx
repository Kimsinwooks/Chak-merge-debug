import React, { useEffect, useState } from 'react'
import { Calendar, DoorOpen, LogIn, LogOut, RefreshCw, ShieldCheck } from 'lucide-react'
import { fetchMe, loginWithGoogle, logout } from '../services/authApi'

export default function HomeGate({ onOpenRooms, onOpenCalendar }) {
  const [me, setMe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const loadMe = async () => {
    try {
      setLoading(true)
      setMessage('')
      const data = await fetchMe()
      setMe(data)
    } catch (err) {
      setMessage(err.message || '로그인 상태를 확인하지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      await loadMe()
    } catch (err) {
      setMessage(err.message || '로그아웃 실패')
    }
  }

  useEffect(() => {
    loadMe()
  }, [])

  const authenticated = !!me?.authenticated
  const user = me?.user

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <section className="rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-10 shadow-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold mb-6">
            <ShieldCheck className="w-4 h-4" />
            Google OAuth 기반 회의 워크스페이스
          </div>

          <h1 className="text-4xl lg:text-5xl font-black leading-tight">
            ChakChak AI 회의 어시스턴트
          </h1>

          <p className="mt-5 text-blue-50 leading-7 text-lg">
            룸 기반으로 팀원을 초대하고, 회의 STT·분석·To-Do·캘린더를 한 곳에서 관리합니다.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="font-bold">Google 로그인</div>
              <div className="mt-1 text-blue-100">계정별 룸 분리</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="font-bold">룸 초대</div>
              <div className="mt-1 text-blue-100">링크 공유 방식</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <div className="font-bold">AI 분석</div>
              <div className="mt-1 text-blue-100">SLM 기반 피드백</div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white text-slate-900 p-8 shadow-2xl">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-2xl font-black">시작하기</h2>
              <p className="text-sm text-slate-500 mt-1">
                로그인 후 참여 중인 룸을 선택하세요.
              </p>
            </div>

            <button
              onClick={loadMe}
              className="w-10 h-10 rounded-2xl border border-slate-200 flex items-center justify-center hover:bg-slate-50"
              title="새로고침"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {message && (
            <div className="mb-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 px-4 py-3 text-sm">
              {message}
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 text-slate-500">
              로그인 상태 확인 중...
            </div>
          ) : !authenticated ? (
            <div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5">
                <div className="font-bold text-slate-900">로그인이 필요합니다.</div>
                <div className="mt-2 text-sm text-slate-500 leading-6">
                  Google 계정으로 로그인하면 본인이 만든 룸과 초대받은 룸만 표시됩니다.
                </div>
              </div>

              <button type="button"
                onClick={loginWithGoogle}
                className="mt-5 w-full h-13 rounded-2xl bg-blue-600 text-white font-black flex items-center justify-center gap-2 hover:bg-blue-700"
              >
                <LogIn className="w-5 h-5" />
                Google로 로그인
              </button>
            </div>
          ) : (
            <div>
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 flex items-center gap-4">
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={user?.name || 'user'}
                    className="w-14 h-14 rounded-2xl"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center font-black text-blue-700">
                    {user?.name?.[0] || 'U'}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="font-black truncate">{user?.name || '사용자'}</div>
                  <div className="text-sm text-slate-500 truncate">{user?.email}</div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3">
                <button
                  onClick={onOpenRooms}
                  className="h-14 rounded-2xl bg-blue-600 text-white font-black flex items-center justify-center gap-2 hover:bg-blue-700"
                >
                  <DoorOpen className="w-5 h-5" />
                  룸 선택 / 새 룸 생성
                </button>

                <button
                  onClick={onOpenCalendar}
                  className="h-14 rounded-2xl bg-slate-100 text-slate-800 font-bold flex items-center justify-center gap-2 hover:bg-slate-200"
                >
                  <Calendar className="w-5 h-5" />
                  캘린더로 이동
                </button>

                <button
                  onClick={handleLogout}
                  className="h-12 rounded-2xl border border-slate-200 text-slate-600 font-bold flex items-center justify-center gap-2 hover:bg-slate-50"
                >
                  <LogOut className="w-4 h-4" />
                  로그아웃
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}