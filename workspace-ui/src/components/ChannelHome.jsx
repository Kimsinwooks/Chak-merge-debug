import React, { useState, useEffect } from 'react'
import { fetchRoomSessions, fetchCalendarEvents } from '../services/roomApi'
import {
  Star,
  Video,
  ChevronDown,
  MoreHorizontal,
  ChevronRight,
  Pin,
  FileText,
  LayoutGrid,
  List,
  ChevronLeft,
  Plus
} from 'lucide-react'

export default function ChannelHome({ setActiveView, roomName, channelId, onOpenReport }) {
  const [activeTab, setActiveTab] = useState('home')
  const [recentMeetings, setRecentMeetings] = useState([])
  const [upcomingEvents, setUpcomingEvents] = useState([])

  useEffect(() => {
    if (roomName) {
      fetchRoomSessions(roomName, channelId)
        .then(data => {
          if (data?.sessions) {
            setRecentMeetings(data.sessions)
          }
        })
        .catch(err => console.error("Failed to load meetings", err))

      fetchCalendarEvents(roomName, channelId)
        .then(data => {
          if (data?.events) {
            setUpcomingEvents(data.events.filter(e => new Date(e.date || e.startTime) >= new Date()).sort((a, b) => new Date(a.date || a.startTime) - new Date(b.date || b.startTime)))
          }
        })
        .catch(err => console.error("Failed to load events", err))
    }
  }, [roomName, channelId])

  return (
    <div className="h-full overflow-y-auto bg-[#f9fafb]">

      <div className="p-8 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-[1fr_320px] gap-8">
          
          {/* Left Column */}
          <div className="space-y-8 min-w-0">
            
            {/* 최근 회의 */}
            <section className="bg-white rounded-[24px] p-7 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold text-gray-900 text-lg">최근 회의</h2>
                <button className="text-blue-500 font-bold text-sm">전체 보기</button>
              </div>

                {recentMeetings.length === 0 ? (
                  <div className="text-sm text-gray-500 py-4 text-center">진행된 회의가 없습니다.</div>
                ) : (
                  recentMeetings.slice(0, 4).map(m => {
                    const dateObj = new Date(m.createdAt)
                    const month = `${dateObj.getMonth() + 1}.${String(dateObj.getDate()).padStart(2, '0')}`
                    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
                    const day = dayNames[dateObj.getDay()]
                    const duration = m.meetingTime ? `${m.meetingTime}분` : '시간 미상'
                    
                    return (
                      <RecentMeetingItem 
                        key={m.id}
                        month={month} 
                        day={day}
                        title={m.title} 
                        time={duration} 
                        people="팀원"
                        onClick={() => onOpenReport?.(m.id)}
                      />
                    )
                  })
                )}
            </section>

            {/* 중요한 회의록 */}
            <section>
              <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-2">
                  <Pin className="w-5 h-5 text-gray-700 fill-gray-700" />
                  <h2 className="font-bold text-gray-900 text-lg">중요한 회의록</h2>
                </div>
                <button className="text-gray-400 hover:text-gray-600 font-bold text-[13px] flex items-center gap-1">
                  더보기 <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {recentMeetings.length === 0 ? (
                  <div className="col-span-3 text-sm text-gray-500 py-4 text-center border border-gray-100 rounded-2xl bg-white">중요 회의록이 없습니다.</div>
                ) : (
                  recentMeetings.slice(0, 3).map(m => {
                    const dateObj = new Date(m.createdAt)
                    const dateStr = `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${String(dateObj.getDate()).padStart(2, '0')}`
                    
                    return (
                      <ImportantMinuteCard 
                        key={m.id}
                        title={m.title} 
                        date={dateStr} 
                        author={m.createdBy || '팀원'} 
                        active={true} 
                        onClick={() => onOpenReport?.(m.id)}
                      />
                    )
                  })
                )}
              </div>
            </section>

            {/* 회의 자료 / STT 보관함 */}
            <section className="bg-white rounded-[24px] p-7 shadow-sm border border-gray-100">
              <h2 className="font-bold text-gray-900 text-lg mb-5">회의 자료 / STT 보관함</h2>
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex gap-2">
                  <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[13px] font-bold cursor-pointer">
                    전체 28
                  </span>
                  <span className="px-4 py-1.5 border border-gray-200 text-gray-500 rounded-full text-[13px] font-bold cursor-pointer hover:bg-gray-50">
                    회의 자료 18
                  </span>
                  <span className="px-4 py-1.5 border border-gray-200 text-gray-500 rounded-full text-[13px] font-bold cursor-pointer hover:bg-gray-50">
                    STT 10
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-1 text-gray-500 text-[13px] font-bold">
                    최신순 <ChevronDown className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                    <div className="p-1 bg-white rounded shadow-sm text-indigo-500 cursor-pointer">
                      <LayoutGrid className="w-4 h-4" />
                    </div>
                    <div className="p-1 text-gray-400 cursor-pointer hover:text-gray-600">
                      <List className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <FileCard type="PDF" color="bg-rose-500" title="신제품 UI 리뷰 자료.pdf" date="2026.05.01" author="김서연" size="2.4MB" />
                <FileCard type="TXT" color="bg-blue-500" title="디자인 시스템 논의_STT.txt" date="2026.04.30" author="박준호" size="1.1MB" />
                <FileCard type="PPT" color="bg-amber-500" title="프로젝트A 킥오프 발표.pptx" date="2026.04.28" author="이하은" size="5.3MB" />
                <FileCard type="IMG" color="bg-indigo-500" title="아이콘 레퍼런스.png" date="2026.04.25" author="최지우" size="3.2MB" />
              </div>
            </section>
            
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <section className="bg-white rounded-[24px] p-7 shadow-sm border border-gray-100 sticky top-32">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold text-gray-900 text-[15px]">예정된 일정</h2>
                <button onClick={() => setActiveView?.('channel-calendar')} 
                  className="text-blue-500 font-bold text-xs hover:text-blue-600 transition">전체 캘린더</button>
              </div>

              <div className="flex items-center justify-between mb-6">
                <div className="font-bold text-gray-900 text-sm">2026년 5월</div>
                <div className="flex gap-1">
                  <button className="p-1 border border-gray-100 rounded hover:bg-gray-50">
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                  </button>
                  <button className="p-1 border border-gray-100 rounded hover:bg-gray-50">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="space-y-5 mb-6">
                {upcomingEvents.length === 0 ? (
                  <div className="text-sm text-gray-500 py-4 text-center">예정된 일정이 없습니다.</div>
                ) : (
                  upcomingEvents.slice(0, 3).map(e => {
                    const dateObj = new Date(e.date || e.startTime)
                    const dayNames = ['일', '월', '화', '수', '목', '금', '토']
                    const day = dayNames[dateObj.getDay()]
                    const dateStr = String(dateObj.getDate())
                    let timeStr = '하루 종일'
                    if (e.startTime) {
                      const st = new Date(e.startTime)
                      timeStr = `${String(st.getHours()).padStart(2, '0')}:${String(st.getMinutes()).padStart(2, '0')}`
                      if (e.endTime) {
                        const et = new Date(e.endTime)
                        timeStr += ` - ${String(et.getHours()).padStart(2, '0')}:${String(et.getMinutes()).padStart(2, '0')}`
                      }
                    }

                    return (
                      <ScheduleItem 
                        key={e.id}
                        date={dateStr} 
                        day={day} 
                        title={e.title} 
                        time={timeStr} 
                      />
                    )
                  })
                )}
              </div>

              <button className="w-full py-3 flex items-center justify-center gap-1 text-indigo-500 font-bold text-sm hover:bg-indigo-50 rounded-xl transition-colors">
                <Plus className="w-4 h-4" /> 일정 추가
              </button>
            </section>
          </div>

        </div>
      </div>
    </div>
  )
}

function RecentMeetingItem({ month, day, title, time, people, onClick }) {
  return (
    <div onClick={onClick} className="flex items-center justify-between p-4 rounded-2xl bg-[#f8f9ff] hover:bg-[#f0f3ff] transition-colors cursor-pointer group">
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-center justify-center min-w-[50px]">
          <span className="text-indigo-600 font-black text-base">{month}</span>
          <span className="text-indigo-400 text-xs font-bold">{day}</span>
        </div>
        
        <div>
          <div className="font-bold text-[14px] text-gray-900 mb-1">{title}</div>
          <div className="flex items-center gap-3 text-[12px] text-gray-500 font-medium">
            <span>{time}</span>
            <span>{people}</span>
            <span className="bg-indigo-100 text-indigo-500 px-2 py-0.5 rounded text-[10px] font-bold">회의록 있음</span>
          </div>
        </div>
      </div>
      
      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500" />
    </div>
  )
}

function ImportantMinuteCard({ title, date, author, active, onClick }) {
  return (
    <div onClick={onClick} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative group">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0 shadow-sm">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div className="pr-2">
          <div className="font-bold text-[13px] text-gray-900 leading-tight mb-1.5 line-clamp-2">{title}</div>
          <div className="text-[11px] text-gray-400 font-medium">
            {date} · {author}
          </div>
        </div>
      </div>
      {active && (
        <Pin className="absolute bottom-4 right-4 w-3.5 h-3.5 text-indigo-500 fill-indigo-500" />
      )}
    </div>
  )
}

function FileCard({ type, color, title, date, author, size }) {
  return (
    <div className="border border-gray-100 rounded-2xl p-4 hover:shadow-md transition-shadow cursor-pointer bg-white">
      <div className={`w-9 h-9 rounded-lg ${color} text-white flex items-center justify-center text-[11px] font-black mb-3 shadow-sm`}>
        {type}
      </div>
      <div className="font-bold text-[13px] text-gray-900 leading-tight mb-1.5 truncate" title={title}>{title}</div>
      <div className="text-[11px] text-gray-400 font-medium space-y-0.5">
        <div>{date} · {author}</div>
        <div>{size}</div>
      </div>
    </div>
  )
}

function ScheduleItem({ date, day, title, time }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex flex-col items-center min-w-[24px]">
        <span className="font-black text-gray-900 text-base leading-none mb-1">{date}</span>
        <span className="text-[11px] text-gray-400 font-bold">{day}</span>
      </div>
      <div className="border-l-[3px] border-indigo-100 pl-3.5 py-0.5">
        <div className="font-bold text-[13px] text-gray-800 mb-1">{title}</div>
        <div className="text-gray-400 text-[11px] font-medium">{time}</div>
      </div>
    </div>
  )
}