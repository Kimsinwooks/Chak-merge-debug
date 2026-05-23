import React, { useState } from 'react';
import { Activity, CheckCircle2, ChevronLeft, ChevronRight, ListTodo } from 'lucide-react';

// 키워드 태그 컴포넌트
function KeywordTags({ keywordsString }) {
  const keywordArray = typeof keywordsString === 'string'
    ? keywordsString.split(',').map(k => k.trim()).filter(k => k !== '')
    : [];

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {keywordArray.length > 0 ? (
        keywordArray.map((keyword, index) => (
          <span 
            key={index}
            className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-600 shadow-sm"
          >
            #{keyword}
          </span>
        ))
      ) : (
        <span className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-600 shadow-sm">
          #자유주제
        </span>
      )}
    </div>
  );
}

export default function AgendaSidebar({ data, agendas }) {
  // 💡 사이드바의 열림/닫힘 상태를 관리하는 State
  const [isOpen, setIsOpen] = useState(true);

  return (
    // 💡 isOpen 상태에 따라 넓이가 w-80(열림)에서 w-[72px](닫힘)로 부드럽게(transition-all) 변합니다.
    <div className={`bg-white/95 backdrop-blur-sm border-r border-gray-100 flex flex-col z-20 shrink-0 transition-all duration-300 ease-in-out relative ${isOpen ? 'w-80' : 'w-[72px]'}`}>
      
      {/* 💡 접기/펼치기 토글 버튼 (사이드바 오른쪽 테두리에 반쯤 걸쳐있는 디자인) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-3 top-8 bg-white border border-gray-200 rounded-full p-1.5 shadow-md hover:bg-gray-50 hover:shadow-lg z-50 text-gray-500 transition-all hover:scale-110"
        title={isOpen ? "사이드바 숨기기" : "사이드바 열기"}
      >
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      {/* 💡 열려있을 때 보여줄 UI */}
      {isOpen ? (
        <div className="flex flex-col h-full animate-in fade-in duration-300">
          <div className="p-6 border-b border-gray-100 bg-gradient-to-b from-blue-50/50 to-transparent">
            <div className="inline-flex items-center justify-center px-3 py-1 bg-blue-100/80 text-blue-700 text-[13px] font-bold rounded-full mb-4 shadow-sm border border-blue-200/50">
              <Activity className="w-3 h-3 mr-1" /> 실시간 분석 중
            </div>
            <h1 className="text-[18px] font-extrabold text-gray-900 leading-tight mb-2 tracking-tight">
              {data.title}
            </h1>
            <p className="text-[13px] font-bold text-gray-500 mb-4">{data.time}</p>
            <KeywordTags keywordsString={data.keywords} />
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <h2 className="text-[13px] font-bold text-gray-800 mb-4 uppercase tracking-wider flex items-center">
              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
              진행 안건 (Agendas)
            </h2>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
              {agendas.map((agenda, idx) => (
                <div key={idx} className="relative flex items-start gap-4">
                  <div className="absolute left-0 h-full w-0.5 bg-slate-200" style={{ left: '11px', top: '24px', height: 'calc(100% - 24px)' }}></div>
                  <div className="bg-white border-2 border-emerald-500 rounded-full w-[24px] h-[24px] flex items-center justify-center shrink-0 z-10 shadow-[0_2px_8px_-2px_rgba(16,185,129,0.4)] mt-0.5">
                    <span className="text-[10px] font-bold text-emerald-600">{idx + 1}</span>
                  </div>
                  <div className="bg-white border border-gray-100 p-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 flex-1 hover:-translate-y-0.5">
                    <p className="text-[13px] text-gray-700 font-bold leading-snug">{agenda.replace(/^\d+\.\s*/, '')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* 💡 닫혀있을 때 보여줄 미니 UI */
        <div className="flex flex-col items-center py-6 h-full border-t border-transparent animate-in fade-in duration-300">
          <button 
            onClick={() => setIsOpen(true)}
            className="w-10 h-10 bg-blue-50/80 rounded-xl flex items-center justify-center text-blue-600 shadow-sm hover:bg-blue-100 transition-colors"
            title="진행 안건 열기"
          >
            <ListTodo size={20} />
          </button>
          
          {/* 세로로 적힌 AGENDA 텍스트 (디자인 포인트) */}
          <div 
            className="mt-8 text-gray-300 font-black text-[11px] tracking-[0.3em] flex-1" 
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            AGENDA
          </div>
        </div>
      )}
    </div>
  );
}