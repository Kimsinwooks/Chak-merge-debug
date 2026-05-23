import React, { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Activity } from 'lucide-react'

export default function MicLevelMeter({ active = false }) {
  const [level, setLevel] = useState(0)
  const [status, setStatus] = useState('대기 중')
  const [error, setError] = useState('')
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const audioContextRef = useRef(null)

  useEffect(() => {
    let mounted = true

    async function startMeter() {
      if (!active) {
        setLevel(0)
        setStatus('녹음 대기')
        return
      }

      try {
        setError('')

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream

        const AudioContext = window.AudioContext || window.webkitAudioContext
        const audioContext = new AudioContext()
        audioContextRef.current = audioContext

        const source = audioContext.createMediaStreamSource(stream)
        const analyser = audioContext.createAnalyser()

        analyser.fftSize = 2048
        analyser.smoothingTimeConstant = 0.85
        source.connect(analyser)

        const data = new Uint8Array(analyser.fftSize)

        const tick = () => {
          analyser.getByteTimeDomainData(data)

          let sum = 0
          for (let i = 0; i < data.length; i += 1) {
            const v = (data[i] - 128) / 128
            sum += v * v
          }

          const rms = Math.sqrt(sum / data.length)
          const nextLevel = Math.min(100, Math.round(rms * 260))

          setLevel(nextLevel)

          if (nextLevel < 8) {
            setStatus('입력이 작음')
          } else if (nextLevel < 65) {
            setStatus('감도 적정')
          } else {
            setStatus('입력이 큼')
          }

          rafRef.current = requestAnimationFrame(tick)
        }

        tick()
      } catch (e) {
        setError('마이크 권한 또는 장치 확인 필요')
        setStatus('마이크 오류')
        setLevel(0)
      }
    }

    startMeter()

    return () => {
      mounted = false

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }

      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {})
      }
    }
  }, [active])

  const good = level >= 8 && level < 65
  const high = level >= 65

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2 font-black text-gray-900">
          {active ? <Mic className="w-5 h-5 text-blue-600" /> : <MicOff className="w-5 h-5 text-gray-400" />}
          마이크 입력 감도
        </div>
        <span className="text-xs font-bold text-gray-400">
          STT 원문 숨김
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-sm rounded-3xl border border-gray-100 bg-gray-50 p-6">
          <div className="flex items-center justify-center mb-5">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
              active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              <Activity className="w-9 h-9" />
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-black text-gray-900">{level}%</div>
            <div className={`mt-1 text-sm font-bold ${
              high ? 'text-red-500' : good ? 'text-blue-600' : 'text-gray-400'
            }`}>
              {error || status}
            </div>
          </div>

          <div className="mt-6 h-4 rounded-full bg-white border border-gray-200 overflow-hidden">
            <div
              className={`h-full transition-all duration-100 ${
                high ? 'bg-red-500' : good ? 'bg-blue-600' : 'bg-gray-300'
              }`}
              style={{ width: `${level}%` }}
            />
          </div>

          <div className="mt-4 grid grid-cols-3 text-[11px] text-gray-400 font-bold">
            <span>작음</span>
            <span className="text-center">적정</span>
            <span className="text-right">과도</span>
          </div>

          <p className="mt-5 text-center text-xs leading-relaxed text-gray-400">
            회의 중 STT 텍스트는 화면에 표시하지 않고 백엔드에만 저장합니다.
          </p>
        </div>
      </div>
    </div>
  )
}
