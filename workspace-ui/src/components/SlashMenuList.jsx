import React from 'react';
import { Heading1, Heading2, CheckSquare } from 'lucide-react'; // 아이콘 추가

// 슬래시 메뉴에 뜰 아이템 목록 데이터
export const slashMenuItems = [
  { label: '제목 1', icon: <Heading1 className="h-5 w-5" />, command: 'h1' },
  { label: '제목 2', icon: <Heading2 className="h-5 w-5" />, command: 'h2' },
  { label: '할 일 목록', icon: <CheckSquare className="h-5 w-5" />, command: 'task' },
];

export default function SlashMenuList({ items, selectedIndex, onSelect }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-2xl p-2 w-52 overflow-hidden z-[1000]">
      {items.map((item, index) => (
        <button
          key={item.command}
          onClick={() => onSelect(item.command)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors 
            ${index === selectedIndex ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'}`}
        >
          <div className={`p-1.5 rounded-md ${index === selectedIndex ? 'bg-indigo-100' : 'bg-gray-100'}`}>
            {item.icon}
          </div>
          {item.label}
        </button>
      ))}
    </div>
  );
}