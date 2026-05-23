import React, { useState } from 'react'
import { Download, FileText, Loader2 } from 'lucide-react'
import { generateTemplateMeetingReport } from '../services/meetingReportService'

export default function HwpTemplateReportBox({ sessionId, roomName = '' }) {
  const [templateFile, setTemplateFile] = useState(null)
  const [userPrompt, setUserPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [message, setMessage] = useState('')

  const handleGenerate = async () => {
    if (!templateFile) {
      setMessage('회의록 양식 파일을 선택하세요.')
      return
    }

    setIsGenerating(true)
    setMessage('DOCX 회의록을 작성하는 중입니다...')

    try {
      const result = await generateTemplateMeetingReport({
        templateFile,
        sessionId,
        roomName,
        outputFormat: 'docx',
        userPrompt,
      })
      setMessage(`작성 완료: ${result.filename || 'DOCX 파일'}`)
    } catch (e) {
      setMessage(e.message || '회의록 양식 작성 실패')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="rounded-3xl border border-violet-100 bg-violet-50/60 p-5 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-5 h-5 text-violet-600" />
        <div className="font-black text-gray-900">회의록 양식 자동 작성</div>
      </div>

      <p className="text-sm text-gray-600 leading-6 mb-4">
        HWP, HWPX, DOCX 양식을 업로드하면 회의록 정리 내용을 기반으로
        <b> Word DOCX 파일</b>로 작성해 다운로드합니다.
      </p>

      <div className="grid gap-3">
        <input
          type="file"
          accept=".hwp,.hwpx,.docx"
          onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
          className="block w-full text-sm"
        />

        <div className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-700 border border-violet-100">
          출력 형식: <b>DOCX 고정</b>
        </div>

        <textarea
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          placeholder="추가 작성 지시가 있으면 입력하세요. 예: 의결 사항은 5개 이내 bullet로 정리"
          className="min-h-20 rounded-2xl border border-gray-200 p-3 text-sm outline-none bg-white"
        />

        <button
          onClick={handleGenerate}
          disabled={isGenerating || !sessionId}
          className="h-11 rounded-2xl bg-violet-600 text-white font-black inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          DOCX 회의록 작성 후 다운로드
        </button>

        {message && (
          <div className="text-sm text-violet-700 bg-white rounded-2xl px-4 py-3">
            {message}
          </div>
        )}

        <div className="text-xs text-gray-500 leading-5">
          원본 HWP/HWPX 파일로 다시 저장하지 않고, 안정성을 위해 DOCX로만 출력합니다.
        </div>
      </div>
    </div>
  )
}
