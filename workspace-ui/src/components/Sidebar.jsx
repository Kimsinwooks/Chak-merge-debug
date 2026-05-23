import React, { useEffect, useState } from 'react'
import { BarChart3, Calendar, FileAudio, Radio, Plus, Star, User, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { fetchChannels, createChannel } from '../services/roomApi'

export default function Sidebar({ activeView, setActiveView, activeWorkspace, activeChannel, activeChannelName, setActiveChannel, favoriteRooms = [], toggleFavorite }) {
  const items = [
    { key: 'calendar', label: '캘린더', icon: Calendar },
    { key: 'stt', label: '회의 기록 / STT 보관함', icon: FileAudio },
    { key: 'analysis', label: '회의 분석', icon: BarChart3 },
  ]

  const DEFAULT_ROOM_COLOR = '#7c3aed'
  const COLOR_OPTIONS = ['#7c3aed', '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#ec4899']
  const isChannelPage = Boolean(activeChannel) // 선택된 채널이 있으면 채널 전용 UI 모드

  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [channels, setChannels] = useState([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createStep, setCreateStep] = useState(1)
  const [newChannelName, setNewChannelName] = useState('')
  const [newRoomColor, setNewRoomColor] = useState(DEFAULT_ROOM_COLOR)
  const [visibility, setVisibility] = useState('public')

  useEffect(() => {
    if (activeWorkspace) {
      loadChannels()
    }
  }, [activeWorkspace])

  const normalizeChannels = (data) => {
    if (Array.isArray(data)) return data
    if (Array.isArray(data?.channels)) return data.channels
    return []
  }

  const loadChannels = async () => {
    if (!activeWorkspace) return
    try {
      const data = await fetchChannels(activeWorkspace)
      setChannels(normalizeChannels(data))
    } catch (e) {
      console.error(e)
      setChannels([])
    }
  }

  const openCreateModal = () => {
    setIsCreateModalOpen(true)
    setCreateStep(1)
  }

  const closeCreateModal = () => {
    setIsCreateModalOpen(false)
    setCreateStep(1)
    setNewChannelName('')
    setNewRoomColor(DEFAULT_ROOM_COLOR)
    setVisibility('public')
  }

  const handleCreateChannel = async () => {
    const cName = newChannelName.trim()
    if (!cName) return

    try {
      const created = await createChannel(activeWorkspace, cName, "")
      await loadChannels()

      setActiveChannel(created.id, created.channelName)
      closeCreateModal()
    } catch (e) {
      alert(e.message)
    }
  }

  if (!activeWorkspace) return null; // 워크스페이스 밖에서는 렌더링 안함

  return (
    <>
      <aside className={`h-full bg-[#f6f7fb] border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out flex-shrink-0 overflow-hidden ${isSidebarOpen ? 'w-[290px]' : 'w-[80px]'}`}>
        <div className={`py-6 flex items-center ${isSidebarOpen ? 'px-6 justify-between' : 'px-0 justify-center'}`}>
          {isSidebarOpen && (
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setActiveView('home'); setActiveChannel(null, null); }}>
              <div className="w-11 h-11 rounded-full bg-[#10172a] flex items-center justify-center flex-shrink-0">
                <Radio className="w-5 h-5 text-purple-400" />
              </div>
              <div className="whitespace-nowrap">
                <div className="text-xl font-black text-gray-900">CollabAI</div>
                <div className="text-xs font-semibold text-gray-400">스마트 워크스페이스</div>
              </div>
            </div>
          )}
          
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-400 hover:text-indigo-600 transition-colors p-1.5 rounded-lg hover:bg-slate-200/50" title="좌측 사이드바 토글">
            {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </button>
        </div>

        <div className={`px-5 ${isSidebarOpen ? '' : 'flex justify-center px-0'}`}>
          <button
            onClick={isChannelPage ? openCreateModal : () => setActiveView('prep')}
            className={`flex items-center justify-center gap-3 py-4 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg shadow-purple-200 transition-all ${isSidebarOpen ? 'w-full px-4' : 'w-12 h-12 rounded-full p-0 flex-shrink-0'}`}
            title={!isSidebarOpen ? (isChannelPage ? "채널 만들기" : "실시간 회의 준비") : undefined}
          >
            {isChannelPage ? (
              <>
                <Plus className="w-4 h-4" />
                {isSidebarOpen && <span className="whitespace-nowrap">채널 만들기</span>}
              </>
            ) : (
              <>
                <Radio className="w-4 h-4" />
                {isSidebarOpen && <span className="whitespace-nowrap">실시간 회의 준비</span>}
              </>
            )}
          </button>
        </div>

        {!isChannelPage && (
          <div className={`pt-6 ${isSidebarOpen ? 'px-5' : 'px-3'}`}>
            {isSidebarOpen && <div className="text-sm font-black text-gray-800 mb-3 whitespace-nowrap">메뉴</div>}
            <div className="space-y-3">
              {items.map((item) => {
                const Icon = item.icon
                const active = activeView === item.key
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveView(item.key)}
                    className={`flex items-center rounded-xl text-sm font-bold transition ${
                      active ? 'bg-white text-gray-900 shadow-sm' : 'bg-white/80 text-gray-700 hover:bg-white'
                    } ${isSidebarOpen ? 'w-full justify-between px-4 py-3' : 'w-12 h-12 justify-center mx-auto'}`}
                    title={!isSidebarOpen ? item.label : undefined}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${active ? 'text-indigo-600' : 'text-gray-500'}`} />
                      {isSidebarOpen && <span className="whitespace-nowrap">{item.label}</span>}
                    </span>
                    {isSidebarOpen && <span className="text-gray-300">›</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className={`flex-1 overflow-y-auto pt-7 pb-4 custom-scrollbar ${isSidebarOpen ? 'px-5' : 'px-3'}`}>

          {isChannelPage && (
            <div className={`mb-10 rounded-2xl bg-white shadow-sm border border-indigo-50 ${isSidebarOpen ? 'p-5' : 'p-3 text-center'}`}>
              <h1 className={`font-black text-indigo-600 mb-5 border-b border-gray-100 whitespace-nowrap overflow-hidden text-ellipsis ${isSidebarOpen ? 'text-[17px] pb-4' : 'text-[11px] pb-2'}`} title={!isSidebarOpen ? activeChannelName : undefined}>
                {isSidebarOpen ? `# ${activeChannelName}` : '#'}
              </h1>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-black text-gray-900">채널 멤버 (7)</div>
                <button className="text-xs font-bold text-indigo-500 hover:text-indigo-600 transition-colors">전체 보기</button>
              </div>

              <div className="space-y-3">
                <Member name="김서연" role="백엔드" />
                <Member name="박준호" role="디자이너" />
                <Member name="이하은" role="PM · 사업기획팀" />
                <Member name="최지우" role="디자이너" />
              </div>

              <button className="mt-4 w-full text-sm font-bold text-indigo-500 hover:bg-indigo-50 py-2 rounded-lg transition-colors">
                + 멤버 초대
              </button>

              <button
                onClick={() => setActiveView('chat')}
                className="mt-2 w-full text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 py-2 rounded-lg transition-colors"
              >
                메시지 보내기
              </button>
            </div>
          )}
          
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-black text-gray-800">
              {isChannelPage ? '내 채널' : '채널'}
            </span>
            <button onClick={openCreateModal} className="text-indigo-600 hover:text-purple-600">
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1">
            {channels.map((ch) => {
              const chName = ch.channelName || ch.name
              const chId = ch.id
              const color = ch.color || DEFAULT_ROOM_COLOR

              return (
                <button
                  key={chId}
                  onClick={() => setActiveChannel(chId, chName)}
                  className={`w-full flex items-center rounded-xl transition group ${
                    activeChannel === chId ? 'bg-white shadow-sm' : 'hover:bg-white/50'
                  } ${isSidebarOpen ? 'px-3 py-2.5 gap-3' : 'justify-center h-12'}`}
                  title={!isSidebarOpen ? chName : undefined}
                >
                  <div 
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: color }}
                  />
                  {isSidebarOpen && (
                    <span className={`text-[14px] font-bold truncate ${
                      activeChannel === chId ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'
                    }`}>
                      {chName}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
            

          {isChannelPage && favoriteRooms.length > 0 && (
            <div className="mt-8">
              {isSidebarOpen && (
                <div className="text-xs font-black text-gray-400 mb-4 px-2 tracking-wider flex items-center gap-2">
                  <Star className="w-3 h-3"/> 즐겨찾는 채널
                </div>
              )}
              <div className="space-y-1">
                {favoriteRooms.map(favId => {
                  const ch = channels.find(c => c.id === favId)
                  if (!ch) return null;
                  const color = ch.color || DEFAULT_ROOM_COLOR
                  return (
                    <button 
                      key={favId}
                      onClick={() => setActiveChannel(ch.id, ch.channelName)}
                      className={`w-full flex items-center rounded-xl transition group ${
                        activeChannel === favId ? 'bg-white shadow-sm' : 'hover:bg-white/50'
                      } ${isSidebarOpen ? 'px-3 py-2.5 gap-3' : 'justify-center h-12'}`}
                      title={!isSidebarOpen ? ch.channelName : undefined}
                    >
                      <div 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: color }}
                      />
                      {isSidebarOpen && (
                        <div className="flex-1 flex items-center justify-between overflow-hidden">
                          <span className={`text-[14px] font-bold truncate ${
                            activeChannel === favId ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'
                          }`}>
                            {ch.channelName}
                          </span>
                          <Star 
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFavorite(favId)
                            }}
                            className="w-4 h-4 text-yellow-400 fill-yellow-400 cursor-pointer flex-shrink-0 ml-2" 
                          />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </aside>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45">
          <div className="w-[650px] rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between px-9 pt-8">
              <div>
                <h2 className="text-3xl font-black text-gray-900">채널 생성</h2>
                {createStep === 2 && (
                  <p className="mt-2 text-sm font-bold text-gray-500">
                    # {newChannelName.trim() || '채널이름'}
                  </p>
                )}
              </div>
              <button onClick={closeCreateModal} className="text-gray-500 hover:text-gray-900 text-3xl leading-none">
                ×
              </button>
            </div>

            {createStep === 1 && (
              <div className="px-9 pt-8 pb-7">
                <label className="block text-lg font-black text-gray-900 mb-4">이름</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-500">#</span>
                  <input
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    maxLength={80}
                    autoFocus
                    placeholder="예: 디자인팀 논의"
                    className="w-full h-[62px] rounded-xl border-2 border-blue-300 pl-12 pr-16 text-xl font-semibold outline-none focus:ring-4 focus:ring-blue-100"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xl text-gray-500">
                    {80 - newChannelName.length}
                  </span>
                </div>

                <p className="mt-3 text-base leading-7 text-gray-500 font-medium">
                  채널에서는 특정 주제에 대한 대화가 이루어집니다.
                  찾고 이해하기 쉬운 이름을 사용하세요.
                </p>

                <div className="mt-7">
                  <div className="text-sm font-black text-gray-800 mb-3">채널 색상</div>
                  <div className="flex items-center gap-3">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewRoomColor(color)}
                        className={`w-8 h-8 rounded-full border-2 transition ${
                          newRoomColor === color ? 'border-gray-900 scale-110' : 'border-gray-200'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    선택한 색상은 이후 캘린더 일정 색상으로 사용됩니다.
                  </p>
                </div>

                <div className="mt-14 flex items-center justify-between">
                  <div className="text-xl font-medium text-gray-500">1/2단계</div>
                  <button
                    onClick={() => {
                      if (!newChannelName.trim()) return
                      setCreateStep(2)
                    }}
                    disabled={!newChannelName.trim()}
                    className={`px-9 py-3 rounded-xl text-lg font-black ${
                      newChannelName.trim()
                        ? 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    다음
                  </button>
                </div>
              </div>
            )}

            {createStep === 2 && (
              <div className="px-9 pt-8 pb-7">
                <div className="mb-7">
                  <h3 className="text-lg font-black text-gray-900 mb-4">접근 권한</h3>

                  <label className="flex items-start gap-3 mb-4 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      checked={visibility === 'public'}
                      onChange={() => setVisibility('public')}
                      className="mt-1 w-4 h-4"
                    />
                    <div>
                      <div className="text-lg font-bold text-gray-900">공개 · 누구나 참여</div>
                      <div className="mt-1 text-sm text-gray-500">
                        워크스페이스의 모든 사용자가 조회하거나 참여할 수 있습니다.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      checked={visibility === 'private'}
                      onChange={() => setVisibility('private')}
                      className="mt-1 w-4 h-4"
                    />
                    <div>
                      <div className="text-lg font-bold text-gray-900">비공개 · 일부 참여자만</div>
                      <div className="mt-1 text-sm text-gray-500">
                        초대를 받은 사용자만 조회하거나 참여할 수 있습니다.
                      </div>
                    </div>
                  </label>
                </div>

                <div className="mt-20 flex items-center justify-between">
                  <div className="text-xl font-medium text-gray-500">2/2단계</div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCreateStep(1)}
                      className="px-8 py-3 rounded-xl border border-gray-300 text-lg font-black text-gray-900 hover:bg-gray-50"
                    >
                      뒤로
                    </button>
                    <button
                      onClick={handleCreateChannel}
                      className="px-8 py-3 rounded-xl bg-emerald-700 text-lg font-black text-white hover:bg-emerald-800"
                    >
                      생성
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
function Member({ name, role }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-emerald-400 text-white flex items-center justify-center text-xs font-bold">
        {name[0]}
      </div>

      <div>
        <div className="text-xs font-black text-gray-800">{name}</div>
        <div className="text-[11px] text-gray-400">{role}</div>
      </div>
    </div>
  )
}