import React, { useState } from 'react'
import Sidebar from './components/Sidebar'
import MeetingRoomPrep from './components/MeetingRoomPrep'
import MeetingLiveView from './components/MeetingLiveView'
import STTWorkspace from './components/STTWorkspace'
import MeetingReportView from './components/MeetingReportView'
import Mindmap from './components/Mindmap'
import CalendarView from './components/CalendarView'
import HomeGate from './components/HomeGate'
import RoomSelector from './components/RoomSelector'
import RoomChat from './components/RoomChat'

export default function App() {
  const [entryView, setEntryView] = useState('home')
  const [activeView, setActiveView] = useState('prep')

  const [selectedRoomName, setSelectedRoomName] = useState(null)
  const [sessionData, setSessionData] = useState(null)
  const [reportSessionId, setReportSessionId] = useState(null)
  const [useWebSearch, setUseWebSearch] = useState(false)

  const openReport = (sessionId) => {
    if (sessionId) {
      setReportSessionId(sessionId)
    }
    setActiveView('analysis')
  }

  const enterRoom = (roomName) => {
    setSelectedRoomName(roomName)
    setSessionData(null)
    setReportSessionId(null)
    setUseWebSearch(false)
    setActiveView('prep')
    setEntryView('workspace')
  }

  const openCalendarFromHome = () => {
    setSelectedRoomName(null)
    setSessionData(null)
    setReportSessionId(null)
    setUseWebSearch(false)
    setActiveView('calendar')
    setEntryView('workspace')
  }

  const goHome = () => {
    setEntryView('home')
    setActiveView('prep')
    setSelectedRoomName(null)
    setSessionData(null)
    setReportSessionId(null)
    setUseWebSearch(false)
  }

  const goRooms = () => {
    setEntryView('rooms')
    setActiveView('prep')
    setSessionData(null)
    setReportSessionId(null)
    setUseWebSearch(false)
  }

  const normalizeSessionData = (data) => {
    const sessionId =
      data?.sessionId ||
      data?.session_id ||
      data?.id ||
      data?.session?.id ||
      data?.session?.sessionId ||
      null

    const roomName =
      data?.roomName ||
      data?.room_name ||
      data?.room ||
      selectedRoomName ||
      null

    return {
      ...data,
      sessionId,
      session_id: sessionId,
      id: data?.id || sessionId,
      roomName,
      room_name: roomName,
    }
  }

  if (entryView === 'home') {
    return (
      <HomeGate
        onOpenRooms={() => setEntryView('rooms')}
        onOpenCalendar={openCalendarFromHome}
      />
    )
  }

  if (entryView === 'rooms') {
    return (
      <RoomSelector
        onBackHome={goHome}
        onSelectRoom={enterRoom}
      />
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {activeView !== 'calendar' && (
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
        />
      )}

      <main className="flex-1 flex flex-col overflow-hidden">
        {activeView !== 'calendar' && (
          <header className="h-20 bg-white border-b border-gray-200 px-7 flex items-center justify-between shrink-0">
            <div>
              <div className="text-sm text-gray-500">현재 룸</div>
              <div className="font-black text-lg">
                {selectedRoomName || '룸 미선택'}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={goRooms}
                className="px-4 py-2 rounded-xl border border-gray-900 text-gray-900 font-bold hover:bg-gray-50"
              >
                룸 목록
              </button>

              <button
                onClick={goHome}
                className="px-4 py-2 rounded-xl border border-gray-900 text-gray-900 font-bold hover:bg-gray-50"
              >
                홈
              </button>
            </div>
          </header>
        )}

        {activeView === 'calendar' && (
          <header className="h-20 bg-white border-b border-gray-200 px-7 flex items-center justify-between shrink-0">
            <div>
              <div className="text-sm text-gray-500">캘린더</div>
              <div className="font-black text-lg">사용자 캘린더</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={goRooms}
                className="px-4 py-2 rounded-xl border border-gray-900 text-gray-900 font-bold hover:bg-gray-50"
              >
                룸 목록
              </button>

              <button
                onClick={goHome}
                className="px-4 py-2 rounded-xl border border-gray-900 text-gray-900 font-bold hover:bg-gray-50"
              >
                홈
              </button>
            </div>
          </header>
        )}

        <div className="flex-1 overflow-hidden">
          {activeView === 'prep' && (
            <MeetingRoomPrep
              roomName={selectedRoomName}
              selectedRoomName={selectedRoomName}
              onStartMeeting={(data) => {
                const mergedData = normalizeSessionData(data)
                setSessionData(mergedData)
                setReportSessionId(
                  mergedData?.sessionId ||
                    mergedData?.session_id ||
                    mergedData?.id
                )
                setActiveView('live')
              }}
              onSessionStart={(data) => {
                const mergedData = normalizeSessionData(data)
                setSessionData(mergedData)
                setReportSessionId(
                  mergedData?.sessionId ||
                    mergedData?.session_id ||
                    mergedData?.id
                )
                setActiveView('live')
              }}
            />
          )}

          {activeView === 'chat' && (
            selectedRoomName ? (
              <RoomChat roomName={selectedRoomName} />
            ) : (
              <div className="p-10">
                <h1 className="text-2xl font-black">룸이 선택되지 않았습니다.</h1>
                <p className="mt-2 text-gray-500">
                  팀 채팅과 개인 DM은 특정 룸에 입장한 뒤 사용할 수 있습니다.
                </p>
                <button
                  onClick={goRooms}
                  className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold"
                >
                  룸 선택하러 가기
                </button>
              </div>
            )
          )}

          {activeView === 'live' && (
            sessionData ? (
              <MeetingLiveView
                sessionData={sessionData}
                onOpenReport={openReport}
              />
            ) : (
              <div className="p-10">
                <h1 className="text-2xl font-black">sessionId가 없습니다.</h1>
                <p className="mt-2 text-gray-500">
                  회의를 먼저 시작해야 실시간 회의 화면으로 이동할 수 있습니다.
                </p>
                <button
                  onClick={() => setActiveView('prep')}
                  className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold"
                >
                  회의 준비로 돌아가기
                </button>
              </div>
            )
          )}

          {activeView === 'stt' && (
            <STTWorkspace
              selectedRoomName={selectedRoomName}
              roomName={selectedRoomName}
              onOpenReport={openReport}
            />
          )}

          {activeView === 'analysis' && (
            <MeetingReportView
              selectedRoomName={selectedRoomName}
              roomName={selectedRoomName}
              sessionId={reportSessionId}
              useWebSearch={useWebSearch}
              setUseWebSearch={setUseWebSearch}
            />
          )}

          {activeView === 'calendar' && (
            <CalendarView />
          )}

          {activeView === 'mindmap' && (
            <Mindmap
              selectedRoomName={selectedRoomName}
              roomName={selectedRoomName}
            />
          )}
        </div>
      </main>
    </div>
  )
}
