import { Home, Bell, MessageCircle, Settings } from 'lucide-react'

export default function IconSidebar({ onHomeClick }) {
  return (
    <div className="w-[72px] bg-gradient-to-b from-[#0f172a] to-[#1e293b] flex flex-col items-center py-6 justify-between">
      
      {/* 상단 아이콘 */}
      <div className="flex flex-col items-center gap-6">
        
        <button
          onClick={onHomeClick}
          className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20"
        >
          <Home className="text-white w-5 h-5" />
        </button>

        <Bell className="text-white/60 w-5 h-5" />
        <MessageCircle className="text-white/60 w-5 h-5" />

        <div className="text-white/40 text-xs mt-2">DM</div>

        <Settings className="text-white/60 w-5 h-5" />
      </div>

      {/* 하단 프로필 */}
      <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
        나
      </div>
    </div>
  )
}