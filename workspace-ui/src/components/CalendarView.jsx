import React, { useEffect, useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import {
  CalendarDays,
  Loader2,
  Plus,
  RefreshCw,
  Star,
  Trash2,
} from 'lucide-react'
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvents,
} from '../services/todoCalendarApi'

function todayString() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function toDateOnly(dateLike) {
  if (!dateLike) return todayString()
  if (typeof dateLike === 'string') return dateLike.slice(0, 10)

  const d = new Date(dateLike)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')

  return `${yyyy}-${mm}-${dd}`
}

function getMonthRange(date = new Date()) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0)

  return {
    from: toDateOnly(first),
    to: toDateOnly(last),
  }
}

export default function CalendarView({ roomName, onBack }) {
  const isRoomCalendar = Boolean(roomName)
  const resolvedRoomName = roomName || ''

  const [events, setEvents] = useState([])
  const [weekLabels, setWeekLabels] = useState([])
  const [scope, setScope] = useState(isRoomCalendar ? 'all' : 'personal')
  const [weekFilter, setWeekFilter] = useState('all')
  const [viewType, setViewType] = useState('dayGridMonth')
  const [range, setRange] = useState(() => getMonthRange(new Date()))
  const [selectedDate, setSelectedDate] = useState(todayString())

  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newDate, setNewDate] = useState(todayString())
  const [newStartTime, setNewStartTime] = useState('')
  const [newEndTime, setNewEndTime] = useState('')
  const [newWeekLabel, setNewWeekLabel] = useState('')
  const [newScope, setNewScope] = useState(isRoomCalendar ? 'team' : 'personal')

  const [loading, setLoading] = useState(false)
  const [workingId, setWorkingId] = useState('')
  const [message, setMessage] = useState('')

  const loadEvents = async () => {
    try {
      setLoading(true)
      setMessage('')

      const data = await getCalendarEvents({
        roomName: isRoomCalendar ? resolvedRoomName : undefined,
        scope: isRoomCalendar ? scope : 'personal',
        weekLabel: weekFilter,
        dateFrom: range.from,
        dateTo: range.to,
      })

      setEvents(data.events || [])
      setWeekLabels(data.weekLabels || [])
    } catch (error) {
      console.error(error)
      setMessage(error.message || '캘린더 일정을 불러오지 못했습니다.')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setScope(isRoomCalendar ? 'all' : 'personal')
    setNewScope(isRoomCalendar ? 'team' : 'personal')
  }, [isRoomCalendar, roomName])

  useEffect(() => {
    loadEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, scope, weekFilter, range.from, range.to])

  const fullCalendarEvents = useMemo(() => {
    return events.map((event) => {
      const hasStartTime = Boolean(event.startTime && event.startTime.trim())
      const start = hasStartTime
        ? `${event.startDate}T${event.startTime}`
        : event.startDate

      const end = event.endTime
        ? `${event.endDate || event.startDate}T${event.endTime}`
        : event.endDate || event.startDate

      return {
        id: event.id,
        title: event.title,
        start,
        end,
        allDay: !hasStartTime,
        backgroundColor: event.scope === 'team' ? '#7c3aed' : '#16a34a',
        borderColor: event.scope === 'team' ? '#7c3aed' : '#16a34a',
        extendedProps: event,
      }
    })
  }, [events])

  const selectedEvents = useMemo(() => {
    return events.filter((event) => event.startDate === selectedDate)
  }, [events, selectedDate])

  const todayEvents = useMemo(() => {
    return events.filter((event) => event.startDate === todayString())
  }, [events])

  const importantEvents = useMemo(() => {
    return events
      .filter((event) => event.weekLabel || event.sourceTodoId)
      .slice(0, 5)
  }, [events])

  const handleDatesSet = (arg) => {
    setViewType(arg.view.type)
    setRange({
      from: toDateOnly(arg.start),
      to: toDateOnly(arg.end),
    })
  }

  const handleDateClick = (arg) => {
    const date = arg.dateStr.slice(0, 10)
    setSelectedDate(date)
    setNewDate(date)
  }

  const handleEventClick = (info) => {
    const event = info.event.extendedProps
    if (event?.startDate) {
      setSelectedDate(event.startDate)
      setNewDate(event.startDate)
    }
  }

  const handleCreateEvent = async () => {
    const title = newTitle.trim()

    if (!title) {
      setMessage('일정 제목을 입력하세요.')
      return
    }

    if (!newDate) {
      setMessage('일정 날짜를 선택하세요.')
      return
    }

    if (newScope === 'team' && !isRoomCalendar) {
      setMessage('팀 일정은 방 안 캘린더에서만 추가할 수 있습니다.')
      return
    }

    try {
      setLoading(true)
      setMessage('')

      await createCalendarEvent({
        roomName: newScope === 'team' ? resolvedRoomName : resolvedRoomName || '',
        scope: newScope,
        title,
        description: newDescription,
        startDate: newDate,
        endDate: newDate,
        startTime: newStartTime,
        endTime: newEndTime,
        weekLabel: newWeekLabel,
      })

      setNewTitle('')
      setNewDescription('')
      setNewStartTime('')
      setNewEndTime('')
      setNewWeekLabel('')
      setMessage('일정이 추가되었습니다.')

      await loadEvents()
    } catch (error) {
      console.error(error)
      setMessage(error.message || '일정 추가 실패')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEvent = async (event) => {
    const ok = window.confirm(`"${event.title}" 일정을 삭제할까요?`)
    if (!ok) return

    try {
      setWorkingId(event.id)
      setMessage('')

      await deleteCalendarEvent(event.id)
      setMessage('일정이 삭제되었습니다.')

      await loadEvents()
    } catch (error) {
      console.error(error)
      setMessage(error.message || '일정 삭제 실패')
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
              {isRoomCalendar ? '방 캘린더' : '개인 캘린더'}
            </h1>
            <p className="mt-3 text-gray-500">
              {isRoomCalendar
                ? '방 안의 팀 일정과 내 개인 일정을 FullCalendar로 확인합니다.'
                : '모든 방에서 내가 개인 캘린더에 추가한 일정을 확인합니다.'}
            </p>
            <p className="mt-2 text-blue-600 font-bold">
              {isRoomCalendar ? `현재 방: ${resolvedRoomName}` : '홈 개인 캘린더'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-3 rounded-2xl bg-gray-900 text-white font-black hover:bg-gray-800"
              >
                이전 화면
              </button>
            )}

            <button
              onClick={loadEvents}
              disabled={loading}
              className="px-4 py-3 rounded-2xl bg-white border border-gray-200 text-gray-900 font-black inline-flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              새로고침
            </button>
          </div>
        </div>

        {message && (
          <div className="mt-6 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100 px-5 py-4 whitespace-pre-wrap">
            {message}
          </div>
        )}

        <section className="mt-6 rounded-3xl bg-white border border-gray-200 shadow-sm p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <label>
              <div className="text-sm font-bold text-gray-600 mb-2">보기 범위</div>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                disabled={!isRoomCalendar}
                className="w-full h-12 rounded-xl border border-gray-200 px-3 outline-none focus:border-blue-500 disabled:bg-gray-100"
              >
                <option value="personal">개인 일정</option>
                {isRoomCalendar && <option value="team">팀 일정</option>}
                {isRoomCalendar && <option value="all">개인 + 팀 전체</option>}
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
              <div className="text-sm font-bold text-gray-600 mb-2">선택 날짜</div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  setNewDate(e.target.value)
                }}
                className="w-full h-12 rounded-xl border border-gray-200 px-3 outline-none focus:border-blue-500"
              />
            </label>

            <div>
              <div className="text-sm font-bold text-gray-600 mb-2">현재 보기</div>
              <div className="h-12 rounded-xl bg-gray-50 border border-gray-100 px-3 flex items-center text-sm font-bold text-gray-600">
                {viewType === 'dayGridMonth'
                  ? '월간'
                  : viewType === 'timeGridWeek'
                    ? '주간'
                    : '일간'}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
          <div className="rounded-3xl bg-white border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-5">
              <CalendarDays className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-2xl font-black text-gray-900">
                  캘린더
                </h2>
                <p className="text-sm text-gray-500">
                  월/주/일 보기, 날짜 클릭, 일정 클릭을 지원합니다.
                </p>
              </div>
            </div>

            <div className="calendar-shell">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                height="auto"
                locale="ko"
                selectable
                editable={false}
                nowIndicator
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay',
                }}
                buttonText={{
                  today: '오늘',
                  month: '월',
                  week: '주',
                  day: '일',
                }}
                events={fullCalendarEvents}
                datesSet={handleDatesSet}
                dateClick={handleDateClick}
                eventClick={handleEventClick}
              />
            </div>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl bg-white border border-gray-200 shadow-sm p-5">
              <h2 className="text-xl font-black text-gray-900">
                오늘 일정
              </h2>

              <EventList
                events={todayEvents}
                empty="오늘 일정이 없습니다."
                workingId={workingId}
                onDelete={handleDeleteEvent}
              />
            </section>

            <section className="rounded-3xl bg-white border border-gray-200 shadow-sm p-5">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                중요 일정
              </h2>

              <EventList
                events={importantEvents}
                empty="중요 일정이 없습니다."
                workingId={workingId}
                onDelete={handleDeleteEvent}
              />
            </section>

            <section className="rounded-3xl bg-white border border-gray-200 shadow-sm p-5">
              <h2 className="text-xl font-black text-gray-900">
                {selectedDate} 일정
              </h2>

              <EventList
                events={events.filter((event) => event.startDate === selectedDate)}
                empty="선택한 날짜에 일정이 없습니다."
                workingId={workingId}
                onDelete={handleDeleteEvent}
              />
            </section>

            <section className="rounded-3xl bg-white border border-gray-200 shadow-sm p-5">
              <h2 className="text-xl font-black text-gray-900">
                일정 직접 추가
              </h2>

              <div className="mt-4 space-y-3">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="일정 제목"
                  className="w-full h-11 rounded-xl border border-gray-200 px-3 outline-none focus:border-blue-500"
                />

                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="일정 설명"
                  className="w-full min-h-[80px] rounded-xl border border-gray-200 px-3 py-2 outline-none focus:border-blue-500"
                />

                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full h-11 rounded-xl border border-gray-200 px-3 outline-none focus:border-blue-500"
                />

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full h-11 rounded-xl border border-gray-200 px-3 outline-none focus:border-blue-500"
                  />

                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full h-11 rounded-xl border border-gray-200 px-3 outline-none focus:border-blue-500"
                  />
                </div>

                <input
                  value={newWeekLabel}
                  onChange={(e) => setNewWeekLabel(e.target.value)}
                  placeholder="예: 1주차"
                  className="w-full h-11 rounded-xl border border-gray-200 px-3 outline-none focus:border-blue-500"
                />

                <select
                  value={newScope}
                  onChange={(e) => setNewScope(e.target.value)}
                  className="w-full h-11 rounded-xl border border-gray-200 px-3 outline-none focus:border-blue-500"
                >
                  <option value="personal">개인 캘린더</option>
                  {isRoomCalendar && <option value="team">팀 캘린더</option>}
                </select>

                <button
                  onClick={async () => {
                    await handleCreateEvent()
                  }}
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-blue-600 text-white font-black inline-flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  일정 추가
                </button>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </div>
  )
}

function EventList({ events, empty, workingId, onDelete }) {
  if (!events || events.length === 0) {
    return (
      <div className="mt-4 rounded-2xl bg-gray-50 border border-gray-100 p-5 text-gray-500 text-sm">
        {empty}
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-3">
      {events.map((event) => (
        <div
          key={event.id}
          className="rounded-2xl bg-gray-50 border border-gray-100 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-black text-gray-900">
                {event.title}
              </div>

              <div className="mt-1 text-xs text-gray-500">
                {event.startDate}
                {event.startTime ? ` ${event.startTime}` : ''}
                {' · '}
                {event.scope === 'team' ? '팀 일정' : '개인 일정'}
                {event.weekLabel ? ` · ${event.weekLabel}` : ''}
              </div>

              {event.description && (
                <div className="mt-2 text-sm text-gray-600 leading-5">
                  {event.description}
                </div>
              )}
            </div>

            <button
              onClick={() => onDelete(event)}
              disabled={workingId === event.id}
              className="shrink-0 w-9 h-9 rounded-xl bg-red-50 text-red-600 inline-flex items-center justify-center hover:bg-red-100 disabled:opacity-50"
            >
              {workingId === event.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}