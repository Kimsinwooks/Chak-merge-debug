import RoomSelector from './components/RoomSelector'
import HomeGate from './components/HomeGate'

import React, { useMemo, useState } from 'react'
import Sidebar from './components/Sidebar'
import MeetingRoomPrep from './components/MeetingRoomPrep'
import MeetingLiveView from './components/MeetingLiveView'
import MeetingReportView from './components/MeetingReportView'

import CalendarView from './components/CalendarView'
import HomeDashboard from './components/HomeDashboard'
import IconSidebar from './components/IconSidebar'
import ChannelHome from './components/ChannelHome'
import { Star, Video, ChevronDown, MoreHorizontal } from 'lucide-react'


{/*채팅,to do list, SLm 챗 */}
import RoomChat from './components/KimRoomChat'
import KimTodoBoard from './components/KimTodoBoard'
import FloatingMiniAssistant from './components/KimFloatingMiniAssistant'

{/* 신우 STT */}
import KimSTTWorkspace from './components/KimSTTWorkspace'


export default function App() {
  const [entryView, setEntryView] = useState('home')   //룸 선택 메인 접속 화면
  const [activeView, setActiveView] = useState('channel')
  const [lastWorkspaceView, setLastWorkspaceView] = useState('channel')
  
  const [selectedRoomName, setSelectedRoomName] = useState(null)
  const [selectedChannelId, setSelectedChannelId] = useState(null)
  const [selectedChannelName, setSelectedChannelName] = useState(null)
  const [sessionData, setSessionData] = useState(null)
  const [reportSessionId, setReportSessionId] = useState(null)
  const [useWebSearch, setUseWebSearch] = useState(false)
  const [favoriteRooms, setFavoriteRooms] = useState([])


  const currentSessionId = useMemo(() => {
  return (
    sessionData?.sessionId ||
    sessionData?.session_id ||
    sessionData?.id ||
    reportSessionId ||
    null
  )
}, [sessionData, reportSessionId])

const moveActiveView = (nextView) => {
  if (nextView === 'calendar') {
    if (activeView !== 'calendar') {
      setLastWorkspaceView(activeView || 'channel')
    }

    setActiveView('calendar')
    return
  }

  setLastWorkspaceView(nextView)
  setActiveView(nextView)
}

const openReport = (sessionId) => {
  if (sessionId) {
    setReportSessionId(sessionId)
  }

  moveActiveView('analysis')
}

const enterRoom = (roomName) => {
  setSelectedRoomName(roomName)
  setSelectedChannelId(null)
  setSelectedChannelName(null)
  setSessionData(null)
  setReportSessionId(null)
  setUseWebSearch(false)
  setLastWorkspaceView('home')
  setActiveView('home')
  setEntryView('workspace')
}

const openCalendarFromHome = () => {
  setSelectedRoomName(null)
  setSessionData(null)
  setReportSessionId(null)
  setUseWebSearch(false)
  setLastWorkspaceView('home')
  setActiveView('calendar')
  setEntryView('workspace')
}

const goHome = () => {
  setEntryView('home')
  setActiveView('channel')
  setLastWorkspaceView('channel')
  setSelectedRoomName(null)
  setSelectedChannelId(null)
  setSelectedChannelName(null)
  setSessionData(null)
  setReportSessionId(null)
  setUseWebSearch(false)
}

const goRooms = () => {
  setEntryView('rooms')
  setActiveView('channel')
  setLastWorkspaceView('channel')
  setSessionData(null)
  setReportSessionId(null)
  setSelectedChannelId(null)
  setSelectedChannelName(null)
  setUseWebSearch(false)
}
  const toggleFavorite = (roomName) => {
    if (!roomName) return
    setFavoriteRooms(prev => 
      prev.includes(roomName)
        ? prev.filter(r => r !== roomName)
        : [...prev, roomName]
    )
  }

  const selectChannel = (channelId, channelName) => {
    setSelectedChannelId(channelId)
    setSelectedChannelName(channelName)
    setSessionData(null)
    setReportSessionId(null)
    setUseWebSearch(false)
    setActiveView('channel')
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
    <div className="flex h-screen w-screen overflow-hidden bg-[#f7f8fc]">
      <IconSidebar
        onHomeClick={() => {
          setSelectedChannelId(null)
          setSelectedChannelName(null)
          setActiveView('home')
          setLastWorkspaceView('home')
        }}
      />

      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        activeWorkspace={selectedRoomName}
        activeChannel={selectedChannelId}
        activeChannelName={selectedChannelName}
        setActiveChannel={selectChannel}
        favoriteRooms={favoriteRooms}
        toggleFavorite={toggleFavorite}
      />

      <main className="flex-1 min-w-0 flex flex-col bg-[#fbfcff] h-screen">
        {activeView === 'home' && (
          <div className="flex-1 overflow-y-auto">
            <HomeDashboard
              selectedRoomName={selectedRoomName}
              setActiveView={setActiveView}
              setActiveChannel={selectChannel}
              onOpenReport={openReport}
            />
          </div>
        )}

        {(activeView !== 'home' && activeView !== 'calendar') && (
          <>
            <ChannelHeader 
              selectedRoomName={selectedRoomName} 
              selectedChannelName={selectedChannelName}
              selectedChannelId={selectedChannelId}
              activeView={activeView} 
              setActiveView={setActiveView}
              favoriteRooms={favoriteRooms}
              toggleFavorite={toggleFavorite}
            />

            <div className="flex-1 overflow-hidden">
              {activeView === 'channel' && <ChannelHome setActiveView={setActiveView} roomName={selectedRoomName} channelId={selectedChannelId} onOpenReport={openReport} />}

              {activeView === 'prep' && (
                  <MeetingRoomPrep
                    roomName={selectedRoomName}
                    channelId={selectedChannelId}
                    onStartMeeting={(data) => {
                      const mergedData = {
                        ...data,
                        roomName: data?.roomName || selectedRoomName,
                        channelId: selectedChannelId,
                      }

                    setSessionData(mergedData)
                    setReportSessionId(mergedData?.sessionId || mergedData?.id)
                    setActiveView('live')
                  }}
                />
              )}

              {activeView === 'live' && (
                sessionData ? (
                  <MeetingLiveView
                    planData={sessionData}
                    roomName={selectedRoomName}
                    channelId={selectedChannelId}
                    useWebSearch={useWebSearch}
                    setUseWebSearch={setUseWebSearch}
                    onOpenMeetingReport={openReport}
                  />
                ) : (
                  <div className="p-10">
                    <h1 className="text-2xl font-bold">sessionId가 없습니다.</h1>
                    <button
                      onClick={() => setActiveView('prep')}
                      className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white"
                    >
                      회의 준비로 돌아가기
                    </button>
                  </div>
                )
              )}

              {/* {activeView === 'stt' && (
                <STTWorkspace
                  roomName={selectedRoomName}
                  onOpenMeetingReport={openReport}
                />
              )}
               */}
              
              {/* 신우 STT */}
                {activeView === 'stt' && (
                  <KimSTTWorkspace
                    roomName={selectedRoomName}
                    channelId={selectedChannelId}
                    onOpenMeetingReport={openReport}
                  />
                )}

                {activeView === 'analysis' && (
                <MeetingReportView
                  roomName={selectedRoomName}
                  channelId={selectedChannelId}
                  sessionId={reportSessionId || sessionData?.sessionId || sessionData?.id}
                />
              )}

              {activeView === 'calendar' && <CalendarView roomName={selectedRoomName} channelId={selectedChannelId} onOpenReport={openReport} />}

              {activeView === 'channel-calendar' && <CalendarView roomName={selectedRoomName} filterChannel={selectedChannelName || selectedChannelId} channelId={selectedChannelId} onOpenReport={openReport} />}


            </div>
          </>
        )}

        {activeView === 'calendar' && (
          <div className="flex-1 overflow-hidden">
            <CalendarView roomName={selectedRoomName} channelId={selectedChannelId} onOpenReport={openReport} />
          </div>
        )}
        


        {activeView === 'chat' && (
          <RoomChat roomName={selectedRoomName} channelId={selectedChannelId} />
        )}

        {activeView === 'todo' && (
          <KimTodoBoard roomName={selectedRoomName} channelId={selectedChannelId} />
        )}
      </main>
        <FloatingMiniAssistant
          roomName={selectedRoomName || '전체 워크스페이스'}
          channelId={selectedChannelId}
          sessionId={sessionData?.sessionId || sessionData?.id || reportSessionId}
          activeView={activeView}
          enabled={true}
        />

    </div>
  )
  
}


function ChannelHeader({ selectedRoomName, selectedChannelName, selectedChannelId, activeView, setActiveView, favoriteRooms, toggleFavorite }) {
  const tabs = [
    { key: 'channel', label: '홈' },
    { key: 'channel-calendar', label: '캘린더' },
    { key: 'stt', label: '자료 보관함' },
    { key: 'analysis', label: '회의록' },
    { key: 'todo', label: 'To-Do'}
  ]
  
  const currentTitle = selectedChannelName || selectedRoomName || '선택 안됨'
  const currentId = selectedChannelId || selectedRoomName
  const isFavorite = favoriteRooms?.includes(currentId)

  return (
    <div className="shrink-0 bg-white px-8 pt-7 border-b border-gray-100 z-20">
      <div className="flex items-center justify-between mb-7">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-black text-gray-900"># {currentTitle}</h1>
          <Star 
            onClick={() => toggleFavorite(currentId)}
            className={`w-5 h-5 cursor-pointer transition-colors ${isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400 hover:text-yellow-400'}`}
          />
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveView('prep')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm shadow-sm transition-colors"
          >
            <Video className="w-4 h-4" />
            회의 시작
            <ChevronDown className="w-4 h-4 ml-1 opacity-80" />
          </button>
          <button className="p-2.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-50">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex gap-8 text-[15px] font-bold">
        {tabs.map(tab => {
          const active = activeView === tab.key
          return (
            <div
              key={tab.key}
              onClick={() => setActiveView(tab.key)}
              className={`pb-3 cursor-pointer ${
                active 
                  ? 'text-indigo-600 border-b-2 border-indigo-600' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}


// import React, { useMemo, useState } from 'react'
// import Sidebar from './components/Sidebar'
// import MeetingRoomPrep from './components/MeetingRoomPrep'
// import MeetingLiveView from './components/MeetingLiveView'
// import STTWorkspace from './components/STTWorkspace'
// import MeetingReportView from './components/MeetingReportView'
// import CalendarView from './components/CalendarView'
// import HomeGate from './components/HomeGate'
// import RoomSelector from './components/RoomSelector'
// import RoomChat from './components/RoomChat'
// import TodoBoard from './components/TodoBoard'
// import FloatingMiniAssistant from './components/FloatingMiniAssistant'

// export default function App() {
//   const [entryView, setEntryView] = useState('home')
//   const [activeView, setActiveView] = useState('prep')
//   const [lastWorkspaceView, setLastWorkspaceView] = useState('prep')

//   const [selectedRoomName, setSelectedRoomName] = useState(null)
//   const [sessionData, setSessionData] = useState(null)
//   const [reportSessionId, setReportSessionId] = useState(null)
//   const [useWebSearch, setUseWebSearch] = useState(false)

//   const currentSessionId = useMemo(() => {
//     return (
//       sessionData?.sessionId ||
//       sessionData?.session_id ||
//       sessionData?.id ||
//       reportSessionId ||
//       null
//     )
//   }, [sessionData, reportSessionId])

//   const moveActiveView = (nextView) => {
//     if (nextView === 'calendar') {
//       if (activeView !== 'calendar') {
//         setLastWorkspaceView(activeView || 'prep')
//       }

//       setActiveView('calendar')
//       return
//     }

//     setLastWorkspaceView(nextView)
//     setActiveView(nextView)
//   }

//   const openReport = (sessionId) => {
//     if (sessionId) {
//       setReportSessionId(sessionId)
//     }

//     moveActiveView('analysis')
//   }

//   const enterRoom = (roomName) => {
//     setSelectedRoomName(roomName)
//     setSessionData(null)
//     setReportSessionId(null)
//     setUseWebSearch(false)
//     setLastWorkspaceView('prep')
//     setActiveView('prep')
//     setEntryView('workspace')
//   }

//   const openCalendarFromHome = () => {
//     setSelectedRoomName(null)
//     setSessionData(null)
//     setReportSessionId(null)
//     setUseWebSearch(false)
//     setLastWorkspaceView('home')
//     setActiveView('calendar')
//     setEntryView('workspace')
//   }

//   const goHome = () => {
//     setEntryView('home')
//     setActiveView('prep')
//     setLastWorkspaceView('prep')
//     setSelectedRoomName(null)
//     setSessionData(null)
//     setReportSessionId(null)
//     setUseWebSearch(false)
//   }

//   const goRooms = () => {
//     setEntryView('rooms')
//     setActiveView('prep')
//     setLastWorkspaceView('prep')
//     setSessionData(null)
//     setReportSessionId(null)
//     setUseWebSearch(false)
//   }

//   const goBackFromCalendar = () => {
//     if (selectedRoomName) {
//       const target =
//         lastWorkspaceView && lastWorkspaceView !== 'calendar'
//           ? lastWorkspaceView
//           : 'prep'

//       setActiveView(target)
//       setLastWorkspaceView(target)
//       return
//     }

//     goHome()
//   }

//   const normalizeSession = (data) => {
//     const sessionId =
//       data?.sessionId ||
//       data?.session_id ||
//       data?.id ||
//       data?.data?.sessionId ||
//       data?.data?.session_id ||
//       data?.data?.id ||
//       null

//     const roomName =
//       data?.roomName ||
//       data?.room_name ||
//       data?.data?.roomName ||
//       data?.data?.room_name ||
//       selectedRoomName ||
//       null

//     return {
//       ...data,
//       sessionId,
//       session_id: sessionId,
//       id: data?.id || sessionId,
//       roomName,
//       room_name: roomName,
//     }
//   }

//   if (entryView === 'home') {
//     return (
//       <HomeGate
//         onOpenRooms={() => setEntryView('rooms')}
//         onOpenCalendar={openCalendarFromHome}
//       />
//     )
//   }

//   if (entryView === 'rooms') {
//     return (
//       <RoomSelector
//         onBackHome={goHome}
//         onSelectRoom={enterRoom}
//       />
//     )
//   }

//   return (
//     <div className="h-screen bg-gray-50 flex overflow-hidden">
//       {activeView !== 'calendar' && (
//         <Sidebar
//           activeView={activeView}
//           setActiveView={moveActiveView}
//         />
//       )}

//       <main className="flex-1 flex flex-col overflow-hidden">
//         {activeView !== 'calendar' && (
//           <header className="h-20 bg-white border-b border-gray-200 px-7 flex items-center justify-between shrink-0">
//             <div>
//               <div className="text-sm text-gray-500">현재 룸</div>
//               <div className="font-black text-lg">
//                 {selectedRoomName || '룸 미선택'}
//               </div>
//             </div>

//             <div className="flex items-center gap-2">
//               <button
//                 onClick={goRooms}
//                 className="px-4 py-2 rounded-xl border border-gray-900 text-gray-900 font-bold hover:bg-gray-50"
//               >
//                 룸 목록
//               </button>

//               <button
//                 onClick={goHome}
//                 className="px-4 py-2 rounded-xl border border-gray-900 text-gray-900 font-bold hover:bg-gray-50"
//               >
//                 홈
//               </button>
//             </div>
//           </header>
//         )}

//         {activeView === 'calendar' && (
//           <header className="h-20 bg-white border-b border-gray-200 px-7 flex items-center justify-between shrink-0">
//             <div>
//               <div className="text-sm text-gray-500">
//                 {selectedRoomName ? '방 캘린더' : '개인 캘린더'}
//               </div>
//               <div className="font-black text-lg">
//                 {selectedRoomName || '홈 캘린더'}
//               </div>
//             </div>

//             <div className="flex items-center gap-2">
//               <button
//                 onClick={goBackFromCalendar}
//                 className="px-4 py-2 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800"
//               >
//                 이전 화면
//               </button>

//               {selectedRoomName && (
//                 <button
//                   onClick={goRooms}
//                   className="px-4 py-2 rounded-xl border border-gray-900 text-gray-900 font-bold hover:bg-gray-50"
//                 >
//                   룸 목록
//                 </button>
//               )}

//               <button
//                 onClick={goHome}
//                 className="px-4 py-2 rounded-xl border border-gray-900 text-gray-900 font-bold hover:bg-gray-50"
//               >
//                 홈
//               </button>
//             </div>
//           </header>
//         )}

//         <div className="flex-1 overflow-hidden">
//           {activeView === 'prep' && (
//             <MeetingRoomPrep
//               roomName={selectedRoomName}
//               onStartMeeting={(data) => {
//                 const mergedData = normalizeSession(data)

//                 setSessionData(mergedData)
//                 setReportSessionId(
//                   mergedData?.sessionId ||
//                     mergedData?.session_id ||
//                     mergedData?.id
//                 )
//                 moveActiveView('live')
//               }}
//             />
//           )}

//           {activeView === 'chat' && (
//             selectedRoomName ? (
//               <RoomChat roomName={selectedRoomName} />
//             ) : (
//               <div className="p-10">
//                 <h1 className="text-2xl font-black">룸이 선택되지 않았습니다.</h1>
//                 <p className="mt-2 text-gray-500">
//                   팀 채팅과 개인 DM은 특정 룸에 입장한 뒤 사용할 수 있습니다.
//                 </p>
//                 <button
//                   onClick={goRooms}
//                   className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold"
//                 >
//                   룸 선택하러 가기
//                 </button>
//               </div>
//             )
//           )}

//           {activeView === 'live' && (
//             sessionData ? (
//               <MeetingLiveView
//                 planData={sessionData}
//                 useWebSearch={useWebSearch}
//                 setUseWebSearch={setUseWebSearch}
//                 onOpenMeetingReport={openReport}
//               />
//             ) : (
//               <div className="p-10">
//                 <h1 className="text-2xl font-black">sessionId가 없습니다.</h1>
//                 <button
//                   onClick={() => moveActiveView('prep')}
//                   className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white"
//                 >
//                   회의 준비로 돌아가기
//                 </button>
//               </div>
//             )
//           )}

//           {activeView === 'stt' && (
//             <STTWorkspace
//               roomName={selectedRoomName}
//               onOpenMeetingReport={openReport}
//             />
//           )}

//           {activeView === 'analysis' && (
//             <MeetingReportView
//               roomName={selectedRoomName}
//               sessionId={reportSessionId}
//               useWebSearch={useWebSearch}
//               setUseWebSearch={setUseWebSearch}
//             />
//           )}

//           {activeView === 'todo' && (
//             <TodoBoard roomName={selectedRoomName} />
//           )}

//           {activeView === 'calendar' && (
//             <CalendarView
//               roomName={selectedRoomName}
//               onBack={goBackFromCalendar}
//             />
//           )}
//         </div>
//       </main>

//       <FloatingMiniAssistant
//         enabled={Boolean(selectedRoomName)}
//         roomName={selectedRoomName}
//         sessionId={currentSessionId}
//         activeView={activeView}
//       />
//     </div>
//   )
// }