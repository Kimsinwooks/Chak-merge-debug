import React from 'react';
import { Sparkles, CheckCircle, ChevronRight, ListTodo, User } from 'lucide-react';

export default function AIInsightPanel({ aiResult }) {
  // 결과가 없으면 아무것도 그리지 않음 (부모가 빈 화면을 처리함)
  if (!aiResult) return null;

  return (
    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar fade-in animate-in duration-500">
      
      {/* 1. 전체 요약 */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-2xl shadow-sm border border-indigo-100/50 transition-all hover:shadow-md">
        <div className="flex items-center mb-3">
          <div className="p-1.5 bg-white rounded-lg mr-2 shadow-sm shrink-0">
            <Sparkles className="h-4 w-4 text-indigo-600" />
          </div>
          <h3 className="text-sm font-bold text-indigo-950">전체 요약</h3>
        </div>
        <p className="text-[13px] text-indigo-900/80 leading-relaxed font-medium whitespace-pre-wrap">
          {aiResult.overall}
        </p>
      </div>

      {/* 2. To-do 리스트 */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition-colors hover:border-gray-300">
        <div className="flex items-center mb-4">
          <div className="p-1.5 bg-orange-50 rounded-lg mr-2 shrink-0">
            <ListTodo className="h-4 w-4 text-orange-600" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">사용자별 To-do 리스트</h3>
        </div>
        <ul className="space-y-4">
          {aiResult.todos?.map((item, idx) => (
            <li key={idx} className="flex items-start group">
              <div className="flex-shrink-0 mt-0.5">
                <CheckCircle className="h-4 w-4 text-gray-300 group-hover:text-orange-500 transition-colors" />
              </div>
              <div className="ml-2.5">
                <p className="text-[13px] font-bold text-gray-900">
                  {item.who} <span className="text-[11px] font-normal text-gray-400 ml-1">마감: {item.deadline}</span>
                </p>
                <p className="text-[13px] text-gray-600 font-medium group-hover:text-gray-900 transition-colors mt-0.5">
                  {item.task}
                </p>
              </div>
            </li>
          ))}
          {(!aiResult.todos || aiResult.todos.length === 0) && (
            <p className="text-xs text-gray-500">할 일이 없습니다.</p>
          )}
        </ul>
      </div>

      {/* 3. 맴버별 주요 발화 */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition-colors hover:border-gray-300">
        <div className="flex items-center mb-4">
          <div className="p-1.5 bg-emerald-50 rounded-lg mr-2 shrink-0">
            <User className="h-4 w-4 text-emerald-600" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">참여자별 발화 요약</h3>
        </div>
        <ul className="space-y-4">
          {aiResult.analysis?.map((item, idx) => (
            <li key={idx} className="flex items-start group">
              <div className="flex-shrink-0 mt-0.5">
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
              </div>
              <div className="ml-1.5">
                <p className="text-[13px] font-bold text-gray-900">{item.who}</p>
                <p className="text-[13px] text-gray-600 font-medium group-hover:text-gray-900 transition-colors leading-relaxed mt-0.5">
                  {item.key_point}
                </p>
              </div>
            </li>
          ))}
          {(!aiResult.analysis || aiResult.analysis.length === 0) && (
            <p className="text-xs text-gray-500">발화 분석 결과가 없습니다.</p>
          )}
        </ul>
      </div>

    </div>
  );
}