import React, { useEffect, useMemo, useState } from 'react'
import {
  CalendarPlus,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react'
import {
  addTodoToCalendar,
  deleteTodo,
  getRoomTodos,
  updateTodo,
} from '../services/todoCalendarApi'

const WEEK_OPTIONS = [
  '',
  '1주차',
  '2주차',
  '3주차',
  '4주차',
  '5주차',
  '직접 입력',
]

function todayString() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function normalizeWeekLabel(value) {
  const v = (value || '').trim()
  if (!v || v === '미지정') return ''

  const n = v.match(/^(\d+)$/)
  if (n) return `${n[1]}주차`

  const m = v.match(/(\d+)\s*주\s*차?/)
  if (m) return `${m[1]}주차`

  return v
}

export default function TodoBoard({ roomName }) {
  const resolvedRoomName = roomName || ''

  const [todos, setTodos] = useState([])
  const [sessions, setSessions] = useState([])
  const [weekLabels, setWeekLabels] = useState([])

  const [statusFilter, setStatusFilter] = useState('all')
  const [weekFilter, setWeekFilter] = useState('all')
  const [sessionFilter, setSessionFilter] = useState('all')

  const [dateByTodo, setDateByTodo] = useState({})
  const [scopeByTodo, setScopeByTodo] = useState({})
  const [weekByTodo, setWeekByTodo] = useState({})
  const [customWeekByTodo, setCustomWeekByTodo] = useState({})

  const [loading, setLoading] = useState(false)
  const [workingId, setWorkingId] = useState('')
  const [message, setMessage] = useState('')

  const loadTodos = async () => {
    if (!resolvedRoomName) {
      setTodos([])
      setSessions([])
      setWeekLabels([])
      setMessage('룸을 먼저 선택하세요.')
      return
    }

    try {
      setLoading(true)
      setMessage('')

      const data = await getRoomTodos(resolvedRoomName, {
        status: statusFilter,
        weekLabel: weekFilter,
        sessionId: sessionFilter,
      })

      const loadedTodos = data.todos || []
      setTodos(loadedTodos)
      setSessions(data.sessions || [])

      const mergedWeeks = new Set(data.weekLabels || [])
      for (const todo of loadedTodos) {
        if (todo.weekLabel) mergedWeeks.add(todo.weekLabel)
      }
      setWeekLabels([...mergedWeeks].filter(Boolean).sort())

      const nextDates = {}
      const nextScopes = {}
      const nextWeeks = {}
      const nextCustomWeeks = {}

      for (const todo of loadedTodos) {
        nextDates[todo.id] =
          todo.dueDate ||
          todo.recommendedDueDate ||
          dateByTodo[todo.id] ||
          todayString()

        nextScopes[todo.id] =
          todo.calendarScope ||
          scopeByTodo[todo.id] ||
          'team'

        const currentWeek = normalizeWeekLabel(todo.weekLabel || weekByTodo[todo.id] || '')

        if (
          currentWeek &&
          !['1주차', '2주차', '3주차', '4주차', '5주차'].includes(currentWeek)
        ) {
          nextWeeks[todo.id] = '직접 입력'
          nextCustomWeeks[todo.id] = currentWeek
        } else {
          nextWeeks[todo.id] = currentWeek
          nextCustomWeeks[todo.id] = customWeekByTodo[todo.id] || ''
        }
      }

      setDateByTodo((prev) => ({ ...nextDates, ...prev }))
      setScopeByTodo((prev) => ({ ...nextScopes, ...prev }))
      setWeekByTodo((prev) => ({ ...nextWeeks, ...prev }))
      setCustomWeekByTodo((prev) => ({ ...nextCustomWeeks, ...prev }))
    } catch (error) {
      console.error(error)
      setMessage(error.message || 'To-Do 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTodos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, statusFilter, weekFilter, sessionFilter])

  const counts = useMemo(() => {
    const out = {
      all: todos.length,
      open: 0,
      in_progress: 0,
      done: 0,
      cancelled: 0,
    }

    for (const todo of todos) {
      out[todo.status] = (out[todo.status] || 0) + 1
    }

    return out
  }, [todos])

  const getSelectedWeekForTodo = (todo) => {
    const selected = weekByTodo[todo.id]

    if (selected === '직접 입력') {
      return normalizeWeekLabel(customWeekByTodo[todo.id] || '')
    }

    return normalizeWeekLabel(selected || todo.weekLabel || '')
  }

  const handleSaveWeek = async (todo) => {
    const weekLabel = getSelectedWeekForTodo(todo)

    try {
      setWorkingId(todo.id)
      await updateTodo(todo.id, { weekLabel })
      setMessage(weekLabel ? `${weekLabel}로 저장되었습니다.` : '주차 미지정으로 저장되었습니다.')
      await loadTodos()
    } catch (error) {
      console.error(error)
      setMessage(error.message || '주차 저장 실패')
    } finally {
      setWorkingId('')
    }
  }

  const handleStatusChange = async (todo, nextStatus) => {
    try {
      setWorkingId(todo.id)
      await updateTodo(todo.id, { status: nextStatus })
      setMessage('To-Do 상태가 변경되었습니다.')
      await loadTodos()
    } catch (error) {
      console.error(error)
      setMessage(error.message || 'To-Do 상태 변경 실패')
    } finally {
      setWorkingId('')
    }
  }

  const handleDeleteTodo = async (todo) => {
    const ok = window.confirm(`"${todo.title}" To-Do를 삭제할까요?`)
    if (!ok) return

    try {
      setWorkingId(todo.id)
      await deleteTodo(todo.id)
      setMessage('To-Do가 삭제되었습니다.')
      await loadTodos()
    } catch (error) {
      console.error(error)
      setMessage(error.message || 'To-Do 삭제 실패')
    } finally {
      setWorkingId('')
    }
  }

  const handleAddCalendar = async (todo, scope) => {
    const date = dateByTodo[todo.id] || todayString()
    const weekLabel = getSelectedWeekForTodo(todo)

    if (!date) {
      setMessage('캘린더에 추가할 날짜를 선택하세요.')
      return
    }

    try {
      setWorkingId(todo.id)

      if ((todo.weekLabel || '') !== weekLabel) {
        await updateTodo(todo.id, { weekLabel })
      }

      await addTodoToCalendar(todo.id, {
        scope,
        startDate: date,
        endDate: date,
        weekLabel,
        title: todo.title,
        description: todo.description || '',
      })

      setMessage(
        scope === 'team'
          ? `팀 캘린더에 추가되었습니다.${weekLabel ? ` (${weekLabel})` : ''}`
          : `개인 캘린더에 추가되었습니다.${weekLabel ? ` (${weekLabel})` : ''}`,
      )

      await loadTodos()
    } catch (error) {
      console.error(error)
      setMessage(error.message || '캘린더 추가 실패')
    } finally {
      setWorkingId('')
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto px-8 py-10">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900">
              To-Do / 일정 추천
            </h1>
            <p className="mt-3 text-gray-500">
              회의 분석에서 생성된 후속 작업을 확인하고, 주차를 지정한 뒤 개인/팀 캘린더에 추가합니다.
            </p>
            <p className="mt-2 text-blue-600 font-bold">
              현재 방: {resolvedRoomName}
            </p>
          </div>

          <button
            onClick={loadTodos}
            disabled={loading}
            className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-black inline-flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            새로고침
          </button>
        </div>

        {message && (
          <div className="mt-6 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100 px-5 py-4 whitespace-pre-wrap">
            {message}
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
          <CountCard label="전체" value={counts.all} />
          <CountCard label="대기" value={counts.open} />
          <CountCard label="진행 중" value={counts.in_progress} />
          <CountCard label="완료" value={counts.done} />
          <CountCard label="취소" value={counts.cancelled} />
        </div>

        <section className="mt-6 rounded-3xl bg-white border border-gray-200 shadow-sm p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label>
              <div className="text-sm font-bold text-gray-600 mb-2">상태</div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-12 rounded-xl border border-gray-200 px-3 outline-none focus:border-blue-500"
              >
                <option value="all">전체</option>
                <option value="open">대기</option>
                <option value="in_progress">진행 중</option>
                <option value="done">완료</option>
                <option value="cancelled">취소</option>
              </select>
            </label>

            <label>
              <div className="text-sm font-bold text-gray-600 mb-2">주차</div>
              <select
                value={weekFilter}
                onChange={(e) => setWeekFilter(e.target.value)}
                className="w-full h-12 rounded-xl border border-gray-200 px-3 outline-none focus:border-blue-500"
              >
                <option value="all">전체</option>
                {weekLabels.map((week) => (
                  <option key={week} value={week}>
                    {week}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div className="text-sm font-bold text-gray-600 mb-2">회의</div>
              <select
                value={sessionFilter}
                onChange={(e) => setSessionFilter(e.target.value)}
                className="w-full h-12 rounded-xl border border-gray-200 px-3 outline-none focus:border-blue-500"
              >
                <option value="all">전체 회의</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.title || session.id}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="mt-6 space-y-4">
          {loading && (
            <div className="rounded-3xl bg-white border border-gray-200 p-8 text-gray-500">
              To-Do를 불러오는 중입니다.
            </div>
          )}

          {!loading && todos.length === 0 && (
            <div className="rounded-3xl bg-white border border-gray-200 p-8 text-gray-500">
              현재 조건에 해당하는 To-Do가 없습니다. 회의 분석을 먼저 생성하거나 재생성하세요.
            </div>
          )}

          {!loading &&
            todos.map((todo) => {
              const isWorking = workingId === todo.id
              const selectedWeek = weekByTodo[todo.id] ?? todo.weekLabel ?? ''
              const resolvedWeek = getSelectedWeekForTodo(todo)

              return (
                <div
                  key={todo.id}
                  className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6"
                >
                  <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={todo.status} />
                        <PriorityBadge priority={todo.priority} />
                        {resolvedWeek && (
                          <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-black">
                            {resolvedWeek}
                          </span>
                        )}
                      </div>

                      <h2 className="mt-3 text-xl font-black text-gray-900">
                        {todo.title}
                      </h2>

                      {todo.description && (
                        <p className="mt-2 text-gray-600 leading-6">
                          {todo.description}
                        </p>
                      )}

                      <div className="mt-3 text-xs text-gray-500 space-y-1">
                        <div>회의: {todo.sessionTitle || todo.sessionId || '-'}</div>
                        <div>담당 유형: {todo.assigneeType || 'team'}</div>
                        <div>담당자: {todo.assigneeName || '-'}</div>
                        <div>추천 마감일: {todo.recommendedDueDate || '-'}</div>
                        <div>현재 마감일: {todo.dueDate || '-'}</div>
                      </div>
                    </div>

                    <div className="w-full xl:w-[420px] rounded-2xl bg-gray-50 border border-gray-100 p-4">
                      <div className="text-sm font-black text-gray-700">
                        주차 / 캘린더 추가
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3">
                        <div className="grid grid-cols-[1fr_auto] gap-2">
                          <select
                            value={selectedWeek}
                            onChange={(e) =>
                              setWeekByTodo((prev) => ({
                                ...prev,
                                [todo.id]: e.target.value,
                              }))
                            }
                            className="h-11 rounded-xl border border-gray-200 px-3 outline-none focus:border-blue-500"
                          >
                            <option value="">미지정</option>
                            {WEEK_OPTIONS.filter((w) => w).map((week) => (
                              <option key={week} value={week}>
                                {week}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={() => handleSaveWeek(todo)}
                            disabled={isWorking}
                            className="h-11 px-3 rounded-xl bg-purple-600 text-white font-black inline-flex items-center gap-2 hover:bg-purple-700 disabled:opacity-50"
                          >
                            {isWorking ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            저장
                          </button>
                        </div>

                        {selectedWeek === '직접 입력' && (
                          <input
                            value={customWeekByTodo[todo.id] || ''}
                            onChange={(e) =>
                              setCustomWeekByTodo((prev) => ({
                                ...prev,
                                [todo.id]: e.target.value,
                              }))
                            }
                            placeholder="예: 6주차, 중간발표 전, 최종발표 주간"
                            className="h-11 rounded-xl border border-gray-200 px-3 outline-none focus:border-blue-500"
                          />
                        )}

                        <input
                          type="date"
                          value={dateByTodo[todo.id] || todayString()}
                          onChange={(e) =>
                            setDateByTodo((prev) => ({
                              ...prev,
                              [todo.id]: e.target.value,
                            }))
                          }
                          className="h-11 rounded-xl border border-gray-200 px-3 outline-none focus:border-blue-500"
                        />

                        <select
                          value={scopeByTodo[todo.id] || todo.calendarScope || 'team'}
                          onChange={(e) =>
                            setScopeByTodo((prev) => ({
                              ...prev,
                              [todo.id]: e.target.value,
                            }))
                          }
                          className="h-11 rounded-xl border border-gray-200 px-3 outline-none focus:border-blue-500"
                        >
                          <option value="team">팀 캘린더</option>
                          <option value="personal">개인 캘린더</option>
                        </select>

                        <button
                          onClick={() =>
                            handleAddCalendar(
                              todo,
                              scopeByTodo[todo.id] || todo.calendarScope || 'team',
                            )
                          }
                          disabled={isWorking}
                          className="h-11 rounded-xl bg-blue-600 text-white font-black inline-flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isWorking ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CalendarPlus className="w-4 h-4" />
                          )}
                          캘린더 추가
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleStatusChange(todo, 'open')}
                      disabled={isWorking}
                      className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 disabled:opacity-50"
                    >
                      대기
                    </button>

                    <button
                      onClick={() => handleStatusChange(todo, 'in_progress')}
                      disabled={isWorking}
                      className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm font-bold hover:bg-blue-100 disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      <Clock className="w-4 h-4" />
                      진행 중
                    </button>

                    <button
                      onClick={() => handleStatusChange(todo, 'done')}
                      disabled={isWorking}
                      className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-bold hover:bg-emerald-100 disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      완료
                    </button>

                    <button
                      onClick={() => handleStatusChange(todo, 'cancelled')}
                      disabled={isWorking}
                      className="px-3 py-2 rounded-xl bg-orange-50 text-orange-700 text-sm font-bold hover:bg-orange-100 disabled:opacity-50"
                    >
                      취소
                    </button>

                    <button
                      onClick={() => handleDeleteTodo(todo)}
                      disabled={isWorking}
                      className="px-3 py-2 rounded-xl bg-red-50 text-red-700 text-sm font-bold hover:bg-red-100 disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      삭제
                    </button>
                  </div>
                </div>
              )
            })}
        </section>
      </div>
    </div>
  )
}

function CountCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-4">
      <div className="text-sm text-gray-500 font-bold">{label}</div>
      <div className="mt-2 text-3xl font-black text-gray-900">{value}</div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    open: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-50 text-blue-700',
    done: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-orange-50 text-orange-700',
  }

  const label = {
    open: '대기',
    in_progress: '진행 중',
    done: '완료',
    cancelled: '취소',
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-black ${map[status] || map.open}`}>
      {label[status] || status || '대기'}
    </span>
  )
}

function PriorityBadge({ priority }) {
  const map = {
    low: 'bg-slate-100 text-slate-700',
    medium: 'bg-yellow-50 text-yellow-700',
    high: 'bg-red-50 text-red-700',
  }

  const label = {
    low: '낮음',
    medium: '보통',
    high: '높음',
  }

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-black ${map[priority] || map.medium}`}>
      우선순위 {label[priority] || '보통'}
    </span>
  )
}