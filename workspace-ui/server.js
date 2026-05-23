import React, { useState, useRef, useEffect } from 'react';
import { Mic, Users, Activity, Bot, Sparkles, Pause, Square, Send, FileAudio } from 'lucide-react';
import { chatWithAI, summarizeMeeting } from '../services/aiService';
import STTWorkspace from './STTWorkspace';
import AIInsightPanel from './AIInsightPanel';
import AgendaSidebar from './AgendaSidebar'; // 분리한 사이드바 컴포넌트 불러오기

export default function MeetingWorkspace({ planData }) {
  // 업로드된 데이터가 없을 경우 표시할 기본값
  const data = planData || {
    title: "새로운 즉석 회의", 
    time: "진행 중", 
    keywords: "자유주제" 
  };
  
  // 아젠다가 없을 경우 기본 메시지
  const agendas = data.agendas || ["회의 안건을 기반으로 논의를 시작하세요."];

  // ... (기존 상태 관리 및 함수들 유지 - messages, handleSendMessage 등) ...

  const [messages, setMessages] = useState([
    { sender: 'ai', text: '회의가 시작되었습니다. 우측의 STT 기능을 통해 음성을 올리고 아이디어를 물어보세요!' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  const [isSttOpen, setIsSttOpen] = useState(true);
  const [aiResult, setAiResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (text) => {
    const trimmedText = text.trim();
    if (!trimmedText || isLoading) return;
    
    setMessages((prev) => [...prev, { sender: 'user', text: trimmedText }]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await chatWithAI(trimmedText);
      setMessages((prev) => [...prev, { sender: 'ai', text: response }]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev, 
        { sender: 'ai', text: '네트워크 연결이 지연되고 있거나 AI 서버 오류가 발생했습니다. 다시 시도해주세요.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const handleFetchInsight = async () => {
    setIsAnalyzing(true);
    try {
      const sessionId = data.sessionId || 1;
      const result = await summarizeMeeting(sessionId);
      setAiResult(result);
    } catch (error) {
      console.error('요약 가져오기 실패:', error);
      alert('AI 요약 데이터를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="w-full h-full flex bg-[#131521] overflow-hidden font-sans">
      
      {/* 1. 분리된 Left Sidebar 컴포넌트 사용 */}
      <AgendaSidebar data={data} agendas={agendas} />

      {/* 2. Main Center: AI Chat & Features (기존 내용 그대로 유지) */}
      <div className="flex-1 flex flex-col relative p-6 min-h-0">
        
        {/* ... 기존 UI들 (Top Header, STT Workspace, 채팅 영역, 우측 사이드 패널 등 모두 그대로 유지) ... */}
        {/* (이하 생략된 UI 코드들) */}
      
      </div>
    </div>
  );
}