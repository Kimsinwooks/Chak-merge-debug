import React, { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  Download,
  Eye,
  FileAudio,
  FileText,
  FolderOpen,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import {
  getMeetingTranscript,
  uploadAudioForMeetingReport,
} from '../services/meetingReportService'
import {
  getRoomLibraryTree,
  deleteLibraryItem,
  deleteMeetingReportOutputs,
  uploadRoomKnowledgeFile,
  previewLibraryItem,
  getLibraryItemDownloadUrl,
} from '../services/roomLibraryApi'

export default function STTWorkspace({ roomName, onOpenMeetingReport }) {
  const [tree, setTree] = useState(null)
  const [sessions, setSessions] = useState([])
  const [knowledgeFile, setKnowledgeFile] = useState(null)
  const [audioFile, setAudioFile] = useState(null)

  const [sttModel, setSttModel] = useState('medium')
  const [language, setLanguage] = useState('ko')

  // pyannote는 메모리 부담이 커서 기본 OFF. 필요할 때만 켠다.
  const [diarizationEnabled, setDiarizationEnabled] = useState(false)
  const [speakerCount, setSpeakerCount] = useState('')

  const [isUploadingKnowledge, setIsUploadingKnowledge] = useState(false)
  const [isUploadingAudio, setIsUploadingAudio] = useState(false)

  const [message, setMessage] = useState('')
  const [selectedTranscript, setSelectedTranscript] = useState(null)
  const [speakerFilter, setSpeakerFilter] = useState('ALL')

  const [previewItem, setPreviewItem] = useState(null)
  const [previewText, setPreviewText] = useState('')
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const resolvedRoomName = useMemo(() => String(roomName || '').trim(), [roomName])
  const hasRoom = Boolean(resolvedRoomName && resolvedRoomName !== 'default_room')

  const refreshTree = async () => {
    if (!hasRoom) {
      setTree(null)
      setSessions([])
      setSelectedTranscript(null)
      setMessage('룸을 먼저 선택하세요. STT와 문서는 특정 룸에 들어간 뒤 사용할 수 있습니다.')
      return
    }

    try {
      const data = await getRoomLibraryTree(resolvedRoomName)
      setTree(data)
      setSessions(data.sessions || [])
    } catch (error) {
      console.error(error)
      setMessage(error.message || '자료함을 불러오지 못했습니다.')
      setTree(null)
      setSessions([])
    }
  }

  const refreshAll = async () => {
    await refreshTree()
  }

  useEffect(() => {
    refreshAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedRoomName])

  const requireRoom = () => {
    if (!hasRoom) {
      setMessage('룸을 먼저 선택한 뒤 업로드하세요. default_room으로 섞이는 문제를 막기 위해 업로드를 차단했습니다.')
      return false
    }

    return true
  }

  const handleKnowledgeUpload = async () => {
    if (!requireRoom()) return

    if (!knowledgeFile) {
      setMessage('현재 방에 업로드할 참고 문서를 선택하세요.')
      return
    }

    setIsUploadingKnowledge(true)
    setMessage('')

    try {
      await uploadRoomKnowledgeFile(resolvedRoomName, knowledgeFile)
      setKnowledgeFile(null)
      setMessage(`"${resolvedRoomName}" 방 자료함에 문서 업로드 완료`)
      await refreshAll()
    } catch (error) {
      console.error(error)
      setMessage(error.message || '방별 참고 문서 업로드 실패')
    } finally {
      setIsUploadingKnowledge(false)
    }
  }

  const handleAudioUpload = async () => {
    if (!requireRoom()) return

    if (!audioFile) {
      setMessage('회의 녹음 음성/영상 파일을 선택하세요.')
      return
    }

    setIsUploadingAudio(true)
    setSelectedTranscript(null)
    setMessage(
      `STT 변환 중입니다.\n선택 모델: ${sttModel}\n현재 방: ${resolvedRoomName}\n화자 분리: ${
        diarizationEnabled ? 'ON' : 'OFF'
      }`,
    )

    try {
      const result = await uploadAudioForMeetingReport(audioFile, {
        sttModel,
        language,
        roomName: resolvedRoomName,
        analyzeAfter: false,
        diarizationEnabled,
        speakerCount: speakerCount ? Number(speakerCount) : null,
      })

      setAudioFile(null)

      setMessage(
        `STT 변환 완료.\nsessionId=${result.sessionId}\n현재 방=${
          result.roomName || resolvedRoomName
        }\n화자 분리=${result.diarizationStatus || 'unknown'}\n${
          result.diarizationNote || ''
        }\n분석 화면에서 qwen/gemma 회의 분석을 생성합니다.`,
      )

      await refreshAll()

      if (result.sessionId) {
        onOpenMeetingReport?.(result.sessionId)
      }
    } catch (error) {
      console.error(error)
      setMessage(error.message || '음성파일 업로드/STT 변환 실패')
    } finally {
      setIsUploadingAudio(false)
    }
  }

  const handleViewTranscript = async (sessionId) => {
    try {
      const data = await getMeetingTranscript(sessionId)
      setSelectedTranscript(data)
      setSpeakerFilter('ALL')
    } catch (error) {
      console.error(error)
      setMessage(error.message || 'STT transcript 로딩 실패')
    }
  }

  const handleDeleteItem = async (item) => {
    const ok = window.confirm(
      `"${item.name || item.title || '자료'}" 항목을 삭제할까요?\n실제 파일도 함께 삭제됩니다.`,
    )

    if (!ok) return

    try {
      await deleteLibraryItem(item.id, true)
      setMessage('자료가 삭제되었습니다.')
      await refreshAll()
    } catch (error) {
      console.error(error)
      setMessage(error.message || '자료 삭제 실패')
    }
  }

  const handleDeleteReport = async (sessionId) => {
    const ok = window.confirm(
      '이 회의의 분석 결과와 To-Do output을 삭제할까요?\n원본 STT와 회의 세션은 유지됩니다.',
    )

    if (!ok) return

    try {
      await deleteMeetingReportOutputs(sessionId, true)
      setMessage('회의 분석 결과가 삭제되었습니다.')
      await refreshAll()
    } catch (error) {
      console.error(error)
      setMessage(error.message || '회의 분석 결과 삭제 실패')
    }
  }

  const handlePreviewItem = async (item) => {
    try {
      const data = await previewLibraryItem(item.id)
      setPreviewItem(data)
      setPreviewText(data.text || '미리볼 수 있는 텍스트가 없습니다.')
      setIsPreviewOpen(true)
    } catch (error) {
      console.error(error)
      setMessage(error.message || '자료 미리보기 실패')
    }
  }

  const handleDownloadItem = (item) => {
    const url = getLibraryItemDownloadUrl(item.id)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const filteredTranscriptLines =
    selectedTranscript?.transcriptLines?.filter((line) => {
      if (speakerFilter === 'ALL') return true
      return line.speaker === speakerFilter
    }) || []

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900">
              STT / 자료 보관함
            </h1>
            <p className="mt-3 text-gray-500">
              현재 방 기준으로 회의 중 녹음본, 회의 후 녹음파일, 업로드 문서, 분석 결과를 분리해서 봅니다.
            </p>
            <p className={`mt-2 font-bold ${hasRoom ? 'text-blue-600' : 'text-red-600'}`}>
              현재 방: {hasRoom ? resolvedRoomName : '룸 미선택'}
            </p>
          </div>

          <button
            onClick={refreshAll}
            className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-black inline-flex items-center gap-2 hover:bg-slate-800"
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>
        </div>

        {!hasRoom && (
          <div className="mt-8 rounded-2xl bg-red-50 text-red-700 border border-red-100 px-6 py-5">
            <div className="font-black">룸이 선택되지 않았습니다.</div>
            <div className="mt-2 text-sm leading-6">
              STT 파일과 참고 문서는 반드시 특정 룸에 들어간 뒤 업로드해야 합니다.
              이 상태에서 업로드하면 default_room으로 섞일 수 있으므로 업로드를 차단했습니다.
            </div>
          </div>
        )}

        {message && (
          <div className="mt-8 rounded-2xl bg-purple-50 text-purple-700 px-6 py-4 whitespace-pre-wrap">
            {message}
          </div>
        )}

        {tree?.counts && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
            <CountCard label="세션" value={tree.counts.sessions} />
            <CountCard label="전체 자료" value={tree.counts.allItems} />
            <CountCard label="회의 중" value={tree.counts.realtimeMeetings} />
            <CountCard label="회의 후" value={tree.counts.postMeetingRecordings} />
            <CountCard label="문서" value={tree.counts.uploadedKnowledge} />
            <CountCard label="분석" value={tree.counts.analysisOutputs} />
            <CountCard label="To-Do" value={tree.counts.todoOutputs} />
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="rounded-3xl bg-white border border-gray-200 shadow-sm p-7">
            <div className="flex items-center gap-3">
              <Upload className="w-6 h-6 text-purple-600" />
              <div>
                <h2 className="text-2xl font-black text-gray-900">
                  방별 참고 문서 업로드
                </h2>
                <p className="mt-1 text-gray-500">
                  현재 선택된 방 자료함에만 저장됩니다.
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-4">
              <input
                type="file"
                accept=".txt,.pdf,.docx,.hwp,.json,.md,.csv"
                disabled={!hasRoom}
                onChange={(e) => setKnowledgeFile(e.target.files?.[0] || null)}
                className="block w-full text-sm disabled:opacity-50"
              />

              <div className="text-sm text-gray-700">
                {knowledgeFile ? knowledgeFile.name : '선택된 파일 없음'}
              </div>

              <button
                onClick={handleKnowledgeUpload}
                disabled={!hasRoom || isUploadingKnowledge}
                className="px-5 py-3 rounded-2xl bg-purple-600 text-white font-black inline-flex items-center gap-2 hover:bg-purple-700 disabled:opacity-50"
              >
                {isUploadingKnowledge ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {isUploadingKnowledge ? '업로드 중...' : '방 자료함에 업로드'}
              </button>
            </div>
          </section>

          <section className="rounded-3xl bg-white border border-gray-200 shadow-sm p-7">
            <div className="flex items-center gap-3">
              <FileAudio className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-2xl font-black text-gray-900">
                  회의 후 녹음/영상파일 업로드
                </h2>
                <p className="mt-1 text-gray-500 leading-6">
                  업로드한 녹음/영상은 현재 방에 귀속됩니다. STT와 선택적 화자 분리 후 회의 분석 화면에서 qwen/gemma 분석을 생성합니다.
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-5">
              <div>
                <input
                  type="file"
                  accept=".wav,.mp3,.m4a,.webm,.mp4,.aac,.ogg,.flac,.wma,.wmv"
                  disabled={!hasRoom}
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm disabled:opacity-50"
                />

                <div className="mt-3 text-sm text-gray-700">
                  {audioFile ? audioFile.name : '선택된 음성/영상파일 없음'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <div className="text-sm font-bold text-gray-600 mb-2">
                    STT 모델
                  </div>
                  <select
                    value={sttModel}
                    onChange={(e) => setSttModel(e.target.value)}
                    disabled={!hasRoom}
                    className="w-full h-12 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100"
                  >
                    <option value="base">base 빠름/낮은 정확도</option>
                    <option value="small">small</option>
                    <option value="medium">medium 추천</option>
                    <option value="large-v3">large-v3 고정확도/느림</option>
                    <option value="large-v3-turbo">large-v3-turbo</option>
                  </select>
                </label>

                <label className="block">
                  <div className="text-sm font-bold text-gray-600 mb-2">
                    언어
                  </div>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    disabled={!hasRoom}
                    className="w-full h-12 rounded-xl border border-gray-200 px-3 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100"
                  >
                    <option value="ko">한국어</option>
                    <option value="en">영어</option>
                    <option value="">자동 감지</option>
                  </select>
                </label>
              </div>

              <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={diarizationEnabled}
                    disabled={!hasRoom}
                    onChange={(e) => setDiarizationEnabled(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <div>
                    <div className="font-black text-gray-800 inline-flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      화자 분리 diarization 사용
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      pyannote/Hugging Face를 사용합니다. 메모리 부담이 있어 기본 OFF이며, 긴 파일은 먼저 OFF로 테스트하세요.
                    </div>
                  </div>
                </label>

                <div className="mt-3">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={speakerCount}
                    disabled={!hasRoom || !diarizationEnabled}
                    onChange={(e) => setSpeakerCount(e.target.value)}
                    placeholder="예상 참가자 수 선택사항. 예: 2"
                    className="w-full h-11 rounded-xl border border-gray-200 px-3 outline-none focus:border-blue-500 disabled:bg-gray-100"
                  />
                </div>
              </div>

              <button
                onClick={handleAudioUpload}
                disabled={!hasRoom || isUploadingAudio}
                className="px-5 py-3 rounded-2xl bg-blue-600 text-white font-black inline-flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50"
              >
                {isUploadingAudio ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <BarChart3 className="w-4 h-4" />
                )}
                {isUploadingAudio ? 'STT 변환 중...' : 'STT 후 회의 분석으로 이동'}
              </button>
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-3xl bg-white border border-gray-200 shadow-sm p-7">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-2xl font-black text-gray-900">
                현재 방 회의 세션 목록
              </h2>
              <p className="mt-1 text-gray-500">
                room_name={hasRoom ? resolvedRoomName : '룸 미선택'}
              </p>
            </div>

            <button
              onClick={refreshTree}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold hover:bg-gray-50"
            >
              목록 새로고침
            </button>
          </div>

          {!hasRoom ? (
            <div className="rounded-2xl bg-red-50 border border-red-100 p-6 text-red-600">
              룸을 먼저 선택하면 해당 룸의 세션 목록이 표시됩니다.
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-6 text-gray-500">
              현재 방에 저장된 회의 세션이 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const sessionId = session.sessionId || session.id

                return (
                  <div
                    key={sessionId}
                    className="rounded-2xl border border-gray-100 bg-gray-50 p-5"
                  >
                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-black text-gray-900 text-lg truncate">
                          {session.title || '제목 없는 회의'}
                        </h3>

                        <div className="mt-2 text-xs text-gray-500 break-all">
                          sessionId={sessionId} · 상태={session.status || '-'} · 회의중=
                          {session.liveRecordingCount ?? 0} · 회의후=
                          {session.postRecordingCount ?? 0} · 분석=
                          {session.analysisCount ?? 0} · To-Do=
                          {session.todoCount ?? 0}
                        </div>

                        {session.previewLine && (
                          <div className="mt-3 text-sm text-gray-600 line-clamp-2">
                            {session.previewLine}
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => handleViewTranscript(sessionId)}
                          className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm font-bold inline-flex items-center gap-2 hover:bg-gray-50"
                        >
                          <Eye className="w-4 h-4" />
                          STT 보기
                        </button>

                        <button
                          onClick={() => onOpenMeetingReport?.(sessionId)}
                          className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold inline-flex items-center gap-2 hover:bg-blue-700"
                        >
                          <BarChart3 className="w-4 h-4" />
                          분석 보기
                        </button>

                        {(session.analysisCount > 0 || session.todoCount > 0) && (
                          <button
                            onClick={() => handleDeleteReport(sessionId)}
                            className="px-3 py-2 rounded-xl bg-red-600 text-white text-sm font-bold inline-flex items-center gap-2 hover:bg-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                            분석 삭제
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {selectedTranscript && (
            <div className="mt-8 rounded-2xl bg-slate-950 text-white p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">STT 변환 결과</h2>

                  {selectedTranscript.diarizationNote && (
                    <p className="mt-2 text-sm text-slate-300">
                      {selectedTranscript.diarizationNote}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-300">화자 필터</span>
                  <select
                    value={speakerFilter}
                    onChange={(e) => setSpeakerFilter(e.target.value)}
                    className="h-10 rounded-xl bg-white text-slate-900 px-3 text-sm outline-none"
                  >
                    <option value="ALL">전체</option>
                    {(selectedTranscript.speakers || ['익명1']).map((speaker) => (
                      <option key={speaker} value={speaker}>
                        {speaker}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5 max-h-[420px] overflow-y-auto space-y-2">
                {filteredTranscriptLines.length > 0 ? (
                  filteredTranscriptLines.map((line, idx) => (
                    <div
                      key={`${line.start}-${line.end}-${idx}`}
                      className="rounded-xl bg-white/5 border border-white/10 p-3 text-sm"
                    >
                      <span className="text-blue-300">
                        [{line.start}~{line.end}]
                      </span>{' '}
                      <span className="font-bold">{line.speaker}</span>{' '}
                      <span>{line.text}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400">
                    표시할 STT 결과가 없습니다.
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {hasRoom && (
          <div className="mt-8 grid grid-cols-1 xl:grid-cols-5 gap-6">
            <Panel
              title="회의 중 녹음본"
              icon={<FileAudio className="w-5 h-5 text-blue-600" />}
              items={tree?.realtimeMeetings || []}
              empty="현재 방에 표시할 회의 중 녹음본이 없습니다."
              onPreviewItem={handlePreviewItem}
              onDownloadItem={handleDownloadItem}
              onDeleteItem={handleDeleteItem}
            />

            <Panel
              title="회의 후 녹음본"
              icon={<FolderOpen className="w-5 h-5 text-purple-600" />}
              items={tree?.postMeetingRecordings || []}
              empty="현재 방에 표시할 회의 후 녹음본이 없습니다."
              onPreviewItem={handlePreviewItem}
              onDownloadItem={handleDownloadItem}
              onDeleteItem={handleDeleteItem}
            />

            <Panel
              title="업로드 문서"
              icon={<FileText className="w-5 h-5 text-emerald-600" />}
              items={tree?.uploadedKnowledge || []}
              empty="현재 방에 표시할 업로드 문서가 없습니다."
              onPreviewItem={handlePreviewItem}
              onDownloadItem={handleDownloadItem}
              onDeleteItem={handleDeleteItem}
            />

            <Panel
              title="분석 결과"
              icon={<BarChart3 className="w-5 h-5 text-orange-600" />}
              items={tree?.analysisOutputs || []}
              empty="현재 방에 표시할 분석 결과가 없습니다."
              onPreviewItem={handlePreviewItem}
              onDownloadItem={handleDownloadItem}
              onDeleteItem={handleDeleteItem}
            />

            <Panel
              title="To-Do 결과"
              icon={<FileText className="w-5 h-5 text-rose-600" />}
              items={tree?.todoOutputs || []}
              empty="현재 방에 표시할 To-Do 결과가 없습니다."
              onPreviewItem={handlePreviewItem}
              onDownloadItem={handleDownloadItem}
              onDeleteItem={handleDeleteItem}
            />
          </div>
        )}
      </div>

      {isPreviewOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-6">
          <div className="w-full max-w-4xl max-h-[80vh] rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <div className="text-lg font-black text-gray-900">
                  {previewItem?.name || '자료 미리보기'}
                </div>
                <div className="text-xs text-gray-500">
                  {previewItem?.bucket || '-'} · {previewItem?.kind || '-'}
                </div>
              </div>

              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-900 text-white font-bold"
              >
                닫기
              </button>
            </div>

            <pre className="p-6 overflow-auto max-h-[65vh] whitespace-pre-wrap text-sm text-gray-800 bg-gray-50">
              {previewText}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

function CountCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
      <div className="text-xs text-gray-500 font-bold">{label}</div>
      <div className="text-2xl font-black text-gray-900 mt-1">{value ?? 0}</div>
    </div>
  )
}

function Panel({
  title,
  icon,
  items,
  empty,
  onDeleteItem,
  onPreviewItem,
  onDownloadItem,
}) {
  return (
    <section className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-lg font-black text-gray-900">{title}</h2>
      </div>

      <List
        items={items}
        empty={empty}
        onDeleteItem={onDeleteItem}
        onPreviewItem={onPreviewItem}
        onDownloadItem={onDownloadItem}
      />
    </section>
  )
}

function List({
  items,
  empty,
  onDeleteItem,
  onPreviewItem,
  onDownloadItem,
}) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-2xl bg-gray-50 border border-gray-100 p-5 text-gray-500 text-sm">
        {empty}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div
          key={item.id || item.sessionId || item.name || idx}
          className="rounded-2xl bg-gray-50 border border-gray-100 p-4"
        >
          <h3 className="font-black text-gray-900 text-sm">
            {item.title || item.name || item.sessionTitle || '이름 없는 항목'}
          </h3>

          <div className="mt-1 text-xs text-gray-500">
            {item.bucketLabel || item.kindLabel || item.kind || item.createdAt || ''}
          </div>

          {item.sessionTitle && (
            <div className="mt-1 text-xs text-blue-600">
              회의: {item.sessionTitle}
            </div>
          )}

          {(item.previewLine || item.preview_line) && (
            <div className="mt-2 text-sm text-gray-600 line-clamp-3">
              {item.previewLine || item.preview_line}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {onPreviewItem && item.id && (
              <button
                onClick={() => onPreviewItem(item)}
                className="px-3 py-2 rounded-xl bg-blue-50 text-blue-600 text-xs font-black inline-flex items-center gap-1 hover:bg-blue-100"
              >
                <Eye className="w-3 h-3" />
                미리보기
              </button>
            )}

            {onDownloadItem && item.id && (
              <button
                onClick={() => onDownloadItem(item)}
                className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-black inline-flex items-center gap-1 hover:bg-slate-200"
              >
                <Download className="w-3 h-3" />
                다운로드
              </button>
            )}

            {onDeleteItem && item.id && (
              <button
                onClick={() => onDeleteItem(item)}
                className="px-3 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-black inline-flex items-center gap-1 hover:bg-red-100"
              >
                <Trash2 className="w-3 h-3" />
                삭제
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
