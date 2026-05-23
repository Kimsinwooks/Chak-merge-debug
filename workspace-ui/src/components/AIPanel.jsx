import React from 'react';
import { Sparkles, X } from 'lucide-react';
import AIChatView from './AIChatView'; // 만들어둔 채팅 컴포넌트 불러오기

export default function AIPanel({
  isOpen,
  onClose,
  chatMessages,
  onSendMessage,
  isTyping,
  userName
}) {
  return (
    <div 
      className={`fixed bottom-24 left-[280px] w-[380px] h-[650px] max-h-[80vh] bg-white rounded-[2rem] shadow-[0_15px_50px_rgba(0,0,0,0.15)] transition-all duration-300 z-50 border border-gray-100 flex flex-col overflow-hidden origin-bottom-left ${
        isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div className="flex flex-col bg-gradient-to-r from-indigo-600 to-violet-600 text-white z-20">
        <div className="p-5 flex justify-between items-center">
          <span className="font-bold flex items-center gap-2 text-[16px]">
            <Sparkles className="h-5 w-5 text-indigo-200" /> AI 업무 비서
          </span>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* 본문 영역 */}
      <div className="flex-1 overflow-hidden flex flex-col bg-[#f8f9fc] relative">
        <div className="flex-1 h-full overflow-hidden [&>div>header]:hidden">
          <AIChatView 
            messages={chatMessages} 
            onSendMessage={onSendMessage} 
            isTyping={isTyping}
            userName={userName}
            onClose={onClose} 
          />
        </div>
      </div>
      
    </div>
  );
}