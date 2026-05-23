import React, { useState, useRef } from 'react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import SlashMenuList, { slashMenuItems } from './SlashMenuList';


export default function NotionStyleEditor() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [menuItems] = useState(slashMenuItems);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [caretPosition, setCaretPosition] = useState(0);
  const textareaRef = useRef(null);

  // 본문 입력 시 슬래시 감지 로직
  const handleContentChange = (e) => {
    const value = e.target.value;
    const position = e.target.selectionStart;
    setContent(value);
    setCaretPosition(position);

    // 방금 친 글자가 '/' 이면 메뉴 띄우기
    if (value[position - 1] === '/') {
      setShowSlashMenu(true);
      setSelectedIndex(0);
    } else {
      setShowSlashMenu(false);
    }
  };

  // 키보드 조작 로직 (위/아래 방향키, 엔터)
  const handleKeyDown = (e) => {
    if (showSlashMenu) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % menuItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + menuItems.length) % menuItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleMenuSelect(menuItems[selectedIndex].command);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowSlashMenu(false);
      }
    }
  };

  // 메뉴 선택 시 글자 추가하는 로직
  const handleMenuSelect = (command) => {
    const beforeSlash = content.slice(0, caretPosition - 1);
    const afterSlash = content.slice(caretPosition);
    let newContent = '';

    if (command === 'h1') {
      newContent = `${beforeSlash}# \n${afterSlash}`;
    } else if (command === 'h2') {
      newContent = `${beforeSlash}## \n${afterSlash}`;
    } else if (command === 'task') {
      newContent = `${beforeSlash}- [ ] \n${afterSlash}`;
    }

    setContent(newContent);
    setShowSlashMenu(false);
    
    // 포커스 유지
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 10);
  };

  return (
    <div className="w-full h-full flex justify-center bg-white overflow-y-auto custom-scrollbar relative">
      <div className="w-full max-w-4xl py-20 px-10">
        
        {/* 거대한 제목 입력창 */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목 없음"
          className="w-full text-5xl font-extrabold text-[#37352f] placeholder-gray-200 focus:outline-none mb-10 bg-transparent"
        />

        <Tippy
          visible={showSlashMenu}
          onClickOutside={() => setShowSlashMenu(false)}
          interactive={true}
          placement="bottom-start"
    
          getReferenceClientRect={() => {
            if (textareaRef.current) {
              const textarea = textareaRef.current;
              const text = textarea.value.slice(0, caretPosition);
              
              const textDiv = document.createElement('div');
              const styles = window.getComputedStyle(textarea);
              textDiv.style.font = styles.font;
              textDiv.style.lineHeight = styles.lineHeight;
              textDiv.style.padding = styles.padding;
              textDiv.style.width = styles.width;
              textDiv.style.whiteSpace = 'pre-wrap';
              textDiv.style.position = 'absolute';
              textDiv.style.visibility = 'hidden';
              
              textDiv.innerHTML = text.replace(/\n/g, '<br/>') || ' ';
              
              const span = document.createElement('span');
              span.textContent = '|';
              textDiv.appendChild(span);
              document.body.appendChild(textDiv);
              
              const spanRect = span.getBoundingClientRect();
              const textDivRect = textDiv.getBoundingClientRect();
              document.body.removeChild(textDiv);
              
              const textareaRect = textarea.getBoundingClientRect();
              
              // 커서의 진짜 X, Y 위치
              const cursorTop = spanRect.top - textDivRect.top;
              const cursorLeft = spanRect.left - textDivRect.left;
              
              return {
                top: textareaRect.top + cursorTop - textarea.scrollTop + 25, 
                left: textareaRect.left + cursorLeft - textarea.scrollLeft,
                bottom: textareaRect.top + cursorTop - textarea.scrollTop + 25,
                right: textareaRect.left + cursorLeft - textarea.scrollLeft,
                width: 0,
                height: 0,
              };
            }
            return { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 };
          }}
          content={
            <SlashMenuList 
              items={menuItems} 
              selectedIndex={selectedIndex} 
              onSelect={handleMenuSelect} 
            />
          }
        >
          {/* 본문 입력창 */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            placeholder="글을 작성하거나 AI가 요약한 결과를 확인하세요... '/'(슬래시)를 눌러 명령어를 입력할 수도 있습니다."
            className="w-full min-h-[500px] text-lg leading-relaxed text-[#37352f] placeholder-gray-200 focus:outline-none resize-none bg-transparent"
          />
        </Tippy>
        


        {/* 저장 버튼 */}
        <div className="mt-10 pt-6 border-t border-gray-100 flex justify-end">
          <button className="px-5 py-2.5 bg-[#2563EB] text-white rounded-xl text-sm font-bold hover:bg-[#1D4ED8] transition-colors shadow-sm">
            저장하기
          </button>
        </div>

      </div>
    </div>
  );
}