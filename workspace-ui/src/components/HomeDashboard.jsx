import React, { useEffect, useState } from 'react'
import CalendarView from './CalendarView'
import {
  Plus,
  Calendar,
  FileText,
  Folder,
  Search,
  Bell,
  HelpCircle,
  ChevronRight,
  ExternalLink,
  User,
  Clock,
  Hash
} from 'lucide-react'
import { fetchChannels, fetchCalendarEvents, fetchRoomSessions } from '../services/roomApi'

export default function HomeDashboard({ selectedRoomName, setActiveView, setActiveChannel, onOpenReport }) {
  const today = new Date().toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  const [channels, setChannels] = useState([])
  const [events, setEvents] = useState([])
  const [sessions, setSessions] = useState([])

  const loadChannelsAndData = async () => {
    try {
      const data = await fetchChannels(selectedRoomName)
      let chs = [];
      if (Array.isArray(data)) chs = data
      else if (Array.isArray(data?.channels)) chs = data.channels
      setChannels(chs)

      const eventData = await fetchCalendarEvents(selectedRoomName).catch(() => ({ events: [] }))
      setEvents(eventData.events || [])

      const sessionData = await fetchRoomSessions(selectedRoomName).catch(() => ({ sessions: [] }))
      setSessions(sessionData.sessions || [])
    } catch (e) {
      console.error(e)
      setChannels([])
    }
  }

  useEffect(() => {
    if (selectedRoomName) {
      loadChannelsAndData()
    }
  }, [selectedRoomName])

  return (
    <div className="min-h-screen bg-[#f8fafc] px-8 py-8 font-sans text-slate-900">
      <div className="max-w-[1400px] mx-auto">
        
        {/* Top Navigation */}
        <header className="flex items-center justify-between mb-10">
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                placeholder="검색어를 입력하세요..." 
                className="w-[300px] h-11 pl-11 pr-14 rounded-full bg-white border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm placeholder:text-slate-400 font-medium"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-500">⌘</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-500">K</kbd>
              </div>
            </div>
            
            <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-2">
              <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white text-slate-400 hover:text-slate-600 transition-colors">
                <HelpCircle className="w-5 h-5" />
              </button>
              <button className="relative w-10 h-10 rounded-full flex items-center justify-center hover:bg-white text-slate-400 hover:text-slate-600 transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 border-2 border-[#f8fafc]" />
              </button>
              <button className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-sm shadow-md ml-2 hover:opacity-90 transition-opacity">
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Welcome Banner */}
        <section className="relative overflow-hidden rounded-[32px] bg-indigo-900 p-10 mb-10 shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-900 opacity-90" />
          
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 blur-[60px] rounded-full translate-y-1/3 -translate-x-1/4" />

          <div className="relative z-10">
            <div className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-sm font-bold backdrop-blur-md mb-4">
              {today}
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              {selectedRoomName || '회사'} 워크스페이스에 오신 것을 환영합니다 👋
            </h1>
            <p className="mt-3 text-indigo-100 font-medium text-base max-w-lg leading-relaxed">
              채널별 회의와 정보를 한눈에 확인하고, 스마트하게 협업을 시작해보세요. 모든 것이 준비되어 있습니다.
            </p>
          </div>
        </section>

        {/* Shortcut Cards */}
        <section className="grid grid-cols-4 gap-6 mb-10">
          <ShortcutCard
            icon={Plus}
            color="indigo"
            title="새로운 채널"
            desc="협업을 위한 새 공간 만들기"
          />
          <ShortcutCard
            icon={Calendar}
            color="blue"
            title="전체 일정"
            desc="팀의 모든 회의 일정 확인"
            onClick={() => setActiveView('calendar')}
          />
          <ShortcutCard
            icon={FileText}
            color="emerald"
            title="회의록 모아보기"
            desc="완료된 회의 결과 확인"
            onClick={() => setActiveView('analysis')}
          />
          <ShortcutCard
            icon={Folder}
            color="amber"
            title="자료 및 STT"
            desc="공유된 문서와 음성 기록"
            onClick={() => setActiveView('stt')}
          />
        </section>

        {/* Channels Section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-5 px-1">
            <Hash className="w-5 h-5 text-indigo-500" />
            <h2 className="text-[18px] font-black text-slate-800">채널 목록</h2>
          </div>
          <div className="grid grid-cols-4 gap-6">
            {channels.map((ch, idx) => (
              <button
                key={ch.id || idx}
                onClick={() => setActiveChannel(ch.id, ch.channelName)}
                className="group flex flex-col h-[140px] rounded-[24px] border border-slate-200/60 bg-white p-6 text-left shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-indigo-100 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-auto border transition-transform group-hover:scale-110 duration-300 bg-indigo-50 text-indigo-600 border-indigo-100">
                  <Hash className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[16px] text-slate-800 mb-1">{ch.channelName}</h3>
                  <p className="text-[12px] text-slate-500 font-medium line-clamp-1">{ch.description || '채널 설명이 없습니다.'}</p>
                </div>
              </button>
            ))}
            {channels.length === 0 && (
              <div className="col-span-4 p-8 text-center text-slate-500 font-medium border border-dashed border-slate-300 rounded-[24px]">
                생성된 채널이 없습니다. 좌측 메뉴를 통해 새 채널을 만들어보세요.
              </div>
            )}
          </div>
        </section>

        {/* Middle Grid (Minutes & Schedule) */}
        <div className="grid grid-cols-[1.4fr_2fr] gap-8">
          
          {/* 최근 회의록 */}
          <section className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-5 px-1">
              <h2 className="text-[18px] font-black text-slate-800">최근 회의록</h2>
              <button
                onClick={() => setActiveView('analysis')}
                className="text-sm font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
              >
                전체 보기 <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 rounded-[28px] border border-slate-200/60 bg-white p-3 shadow-sm">
              <div className="flex flex-col gap-1">
                {sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5).map((s, idx) => {
                  const chName = channels.find(c => c.id === s.channelId)?.channelName || s.channelId || s.roomName;
                  const dateStr = new Date(s.createdAt).toLocaleDateString('ko-KR');
                  const colors = [
                    'bg-rose-50 text-rose-600',
                    'bg-blue-50 text-blue-600',
                    'bg-emerald-50 text-emerald-600',
                    'bg-purple-50 text-purple-600',
                    'bg-amber-50 text-amber-600'
                  ];
                  return (
                    <RecentItem 
                      key={s.id} 
                      title={s.title} 
                      channel={chName} 
                      date={dateStr} 
                      color={colors[idx % colors.length]}
                      onClick={() => onOpenReport?.(s.id)}
                    />
                  )
                })}
                {sessions.length === 0 && (
                  <div className="text-slate-400 p-4 text-center font-medium">최근 진행된 회의가 없습니다.</div>
                )}
              </div>
            </div>
          </section>

          {/* 일정 영역 */}
          <section className="flex flex-col h-full">
            <div className="grid grid-cols-2 gap-4 mb-5 px-1">
              <div className="flex items-center">
                <h2 className="text-[18px] font-black text-slate-800">오늘의 일정</h2>
              </div>
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-black text-slate-800">다가오는 일정</h2>
                <button
                  onClick={() => setActiveView('calendar')}
                  className="text-sm font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                >
                  캘린더 <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-5 flex-1 overflow-x-auto pb-4 custom-scrollbar">
              {(() => {
                const todayObj = new Date();
                todayObj.setHours(0,0,0,0);
                
                const next7Days = Array.from({length: 7}, (_, i) => {
                  const d = new Date(todayObj);
                  d.setDate(d.getDate() + i);
                  return d;
                });

                const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

                return next7Days.map((d, idx) => {
                  const dateStr = d.toISOString().split('T')[0];
                  
                  const dayEvents = events
                    .filter(ev => {
                      const evDate = ev.startTime ? ev.startTime.split('T')[0] : ev.date;
                      return evDate === dateStr;
                    })
                    .sort((a, b) => {
                      const timeA = a.startTime ? a.startTime.split('T')[1] : '00:00:00';
                      const timeB = b.startTime ? b.startTime.split('T')[1] : '00:00:00';
                      return timeA.localeCompare(timeB);
                    })
                    .map(ev => {
                       const chName = channels.find(c => c.id === ev.channelId)?.channelName || ev.channelId || ev.roomName;
                       const time = ev.startTime ? ev.startTime.split('T')[1].substring(0,5) : '종일';
                       return { ...ev, time, channelName: chName };
                    });

                  const label = `${d.getMonth() + 1}월 ${d.getDate()}일 (${daysOfWeek[d.getDay()]})`;

                  return (
                    <div key={dateStr} className="w-[280px] shrink-0">
                      <ScheduleCard 
                        date={label} 
                        highlight={idx === 0} 
                        events={dayEvents} 
                      />
                    </div>
                  );
                });
              })()}
            </div>
          </section>
        </div>

        {/* 캘린더 영역 */}
        <section className="mt-12 flex flex-col">
          <div className="flex items-center gap-2 mb-5 px-1">
            <Calendar className="w-5 h-5 text-indigo-500" />
            <h2 className="text-[18px] font-black text-slate-800">전체 캘린더</h2>
          </div>
          <div className="rounded-[32px] border border-slate-200/60 bg-white shadow-sm overflow-hidden h-[800px]">
            <CalendarView isEmbedded={true} roomName={selectedRoomName} />
          </div>
        </section>

      </div>
    </div>
  )
}

function ShortcutCard({ icon: Icon, color, title, desc, onClick }) {
  const colorStyles = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
  }

  return (
    <button
      onClick={onClick}
      className="group flex flex-col h-[180px] rounded-[28px] border border-slate-200/60 bg-white p-7 text-left shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-indigo-100 transition-all duration-300"
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-auto border transition-transform group-hover:scale-110 duration-300 ${colorStyles[color]}`}>
        <Icon className="w-6 h-6" />
      </div>

      <div>
        <h3 className="font-extrabold text-[16px] text-slate-800 mb-1.5">{title}</h3>
        <p className="text-[13px] leading-relaxed text-slate-500 font-medium line-clamp-2">
          {desc}
        </p>
      </div>
    </button>
  )
}

function ScheduleCard({ date, highlight, events = [] }) {
  return (
    <div className={`rounded-[28px] border bg-white p-7 shadow-sm h-full flex flex-col relative overflow-hidden transition-all duration-300 ${highlight ? 'border-indigo-200 shadow-indigo-100' : 'border-slate-200/60'}`}>
      {highlight && <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-500" />}
      
      <div className="flex items-center gap-2 mb-7 mt-1">
        <Clock className={`w-4 h-4 ${highlight ? 'text-indigo-500' : 'text-slate-400'}`} />
        <h3 className="font-extrabold text-[14px] text-slate-800">{date}</h3>
      </div>
      
      <div className="flex-1">
        {events.length === 0 ? (
           <TimelineItem time="" color="bg-slate-300" title="일정 없음" isEmpty={true} isLast={true} />
        ) : (
           events.map((ev, idx) => {
             const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500'];
             const bgs = ['bg-indigo-50 border border-indigo-100', 'bg-emerald-50 border border-emerald-100', 'bg-rose-50 border border-rose-100', 'bg-amber-50 border border-amber-100'];
             const colorIdx = idx % colors.length;
             return (
               <TimelineItem 
                 key={ev.id || idx}
                 time={ev.time} 
                 color={colors[colorIdx]} 
                 bg={bgs[colorIdx]} 
                 title={ev.title} 
                 channel={ev.channelName} 
                 isLast={idx === events.length - 1} 
                 isEmpty={false} 
               />
             )
           })
        )}
      </div>
    </div>
  )
}

function TimelineItem({ time, color, bg, title, channel, avatars, isLast, isEmpty }) {
  return (
    <div className="flex relative group">
      <div className="w-[50px] shrink-0 text-[13px] font-black text-slate-400 pt-[14px] transition-colors group-hover:text-slate-600">{time}</div>
      <div className="relative flex-1 pl-6 pb-7">
        {!isLast && <div className="absolute left-0 top-[28px] bottom-[-14px] w-[2px] bg-slate-100 -translate-x-1/2" />}
        
        {isEmpty ? (
          <>
            <span className={`absolute left-0 top-[20px] w-2 h-2 rounded-full ${color} z-10 -translate-x-1/2 ring-4 ring-white`} />
            <div className="font-bold text-[13px] text-slate-400 pt-[14px]">
              {title}
            </div>
          </>
        ) : (
          <>
            <span className={`absolute left-0 top-[18px] w-3 h-3 rounded-full ${color} z-10 -translate-x-1/2 ring-4 ring-white`} />
            <div className={`rounded-2xl px-5 py-4 ${bg} transition-all duration-300 hover:shadow-md cursor-pointer`}>
              <div className="font-extrabold text-[14px] text-slate-800">{title}</div>
              {channel && (
                <div className="text-[12px] font-bold text-slate-500 mt-1 mb-3"># {channel}</div>
              )}
              {avatars && (
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-400 flex items-center justify-center text-white text-[11px] font-black shadow-sm ring-2 ring-white z-30">김</div>
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[11px] font-black shadow-sm ring-2 ring-white -ml-2 z-20">박</div>
                  <div className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center text-white text-[11px] font-black shadow-sm ring-2 ring-white -ml-2 z-10">이</div>
                  <div className="text-[11px] text-slate-500 font-bold ml-1.5">+2</div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function RecentItem({ title, channel, date, color, onClick }) {
  return (
    <div onClick={onClick} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 cursor-pointer transition-all duration-200 group">
      <div className="flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm ${color}`}>
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <div className="font-extrabold text-[14px] text-slate-800 group-hover:text-indigo-600 transition-colors mb-1">
            {title}
          </div>
          <div className="flex items-center gap-2 text-[12px] font-bold text-slate-400">
            <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-500"># {channel}</span>
            <span>{date}</span>
          </div>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  )
}