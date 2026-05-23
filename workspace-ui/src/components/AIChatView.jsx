import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, Bot, X } from 'lucide-react'; // X 아이콘 추가
import { chatWithAI } from '../../../../../0503_UI/Project_ChakChak/workspace-ui/src/services/aiService';

// 부모로부터 messages, onSendMessage, isTyping, userName, onClose를 받습니다.
export default function AIChatView({ messages, onSendMessage, isTyping, userName, onClose }) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const formatTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isTyping) return;

    // 부모 컴포넌트(App.jsx)의 handleAiChat 함수를 실행시킵니다.
    // 여기서 보낸 텍스트가 AI 서버로 전달됩니다.
    onSendMessage(inputText); 
    setInputText('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 border-l border-gray-200 overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-20">
        <div className="flex items-center">
          <div className="p-1.5 bg-indigo-50 rounded-lg mr-3 shadow-sm border border-indigo-100/50">
            <Sparkles className="h-5 w-5 text-indigo-600" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-gray-900">✨ AI 어시스턴트</h2>
        </div>
        {/* 사이드바를 닫을 수 있는 버튼 추가 */}
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <X className="h-5 w-5 text-gray-400" />
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-8 space-y-6 custom-scrollbar bg-slate-50/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex space-x-3 group ${msg.isAi ? '' : 'flex-row-reverse space-x-reverse'}`}>
            <div className="flex-shrink-0 mt-1">
              {msg.isAi ? (
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                  <Bot className="h-5 w-5 text-white" />
                </div>
              ) : (
                <img 
                  className="h-10 w-10 rounded-full bg-gray-200 object-cover border border-gray-100 shadow-sm transition-transform hover:scale-105" 
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender)}&background=0D8ABC&color=fff`} 
                  alt="" 
                />
              )}
            </div>
            
            <div className={`flex flex-col ${msg.isAi ? 'items-start' : 'items-end'}`}>
              <div className="flex items-baseline mb-1 px-1">
                <span className={`text-[13px] font-bold ${msg.isAi ? 'text-gray-900 mr-2' : 'hidden'}`}>{msg.sender}</span>
                <span className="text-[10px] font-medium text-gray-400">{formatTime(msg.timestamp)}</span>
              </div>
              <div className={`text-[14px] leading-relaxed py-2.5 px-4 shadow-sm whitespace-pre-wrap max-w-[320px] ${
                msg.isAi 
                  ? 'bg-white text-gray-800 rounded-2xl rounded-tl-[4px] border border-gray-100' 
                  : 'bg-indigo-600 text-white rounded-2xl rounded-tr-[4px]'
              }`}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex space-x-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md animate-pulse">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="bg-white text-gray-800 rounded-2xl rounded-tl-[4px] border border-gray-100 py-2.5 px-4 shadow-sm flex items-center space-x-2">
              <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
              <span className="text-[13px] font-medium text-gray-500">생각 중...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-4 bg-white border-t border-gray-100">
        <form onSubmit={handleSubmit} className="flex items-end space-x-2 w-full relative">
          <div className="relative flex-1 group shadow-sm bg-gray-50 border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              rows={1}
              className="block w-full py-3 px-4 bg-transparent outline-none resize-none min-h-[48px] text-[14px] text-gray-800 placeholder-gray-400"
              placeholder={`${userName}님, 무엇이든 물어보세요...`}
              disabled={isTyping}
            />
          </div>
          <button
            type="submit"
            disabled={!inputText.trim() || isTyping}
            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95 mb-0.5"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}