import React, { useState } from 'react';
import { Palette, Smile, Image, Bell, BellOff, User, Search, ChevronDown, ChevronRight, ShieldAlert } from 'lucide-react';
import { useChat, getDefaultAvatar } from '../context/ChatContext';
import { formatLastSeen } from '../utils/date';

const THEME_COLORS = [
  { name: 'Messenger Blue', color: '#0084FF' },
  { name: 'Rose Pink', color: '#E4405F' },
  { name: 'Electric Purple', color: '#7B2CBF' },
  { name: 'Emerald Green', color: '#10B981' },
  { name: 'Sunset Amber', color: '#F59E0B' }
];

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '⚡', '🎉', '🚀', '✨', '👋'];

export default function RightSidebar() {
  const {
    activeConversation,
    messages,
    updateTheme,
    setLightboxMedia
  } = useChat();

  const [isMuted, setIsMuted] = useState(false);
  const [openCustomize, setOpenCustomize] = useState(true);
  const [openMedia, setOpenMedia] = useState(true);
  const [openPrivacy, setOpenPrivacy] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  if (!activeConversation) return null;

  const sharedImages = messages.filter(m => m.type === 'image' && !m.isUnsent && m.fileUrl);

  return (
    <div className="w-72 md:w-[340px] h-full bg-white dark:bg-[#18191a] border-l border-[#e5e7eb] dark:border-[#2f3031] flex flex-col select-none overflow-y-auto flex-shrink-0">
      {/* Contact Profile Overview */}
      <div className="pt-6 pb-4 px-4 flex flex-col items-center text-center">
        <div className="relative mb-3">
          <img
            src={activeConversation.avatar || getDefaultAvatar(activeConversation.name)}
            alt={activeConversation.name}
            className="w-20 h-20 rounded-full object-cover"
          />
          {activeConversation.online && (
            <span className="absolute bottom-1 right-1 w-4 h-4 bg-[#31a24c] border-2 border-white dark:border-[#18191a] rounded-full" />
          )}
        </div>
        <h4 className="font-bold text-[17px] text-[#050505] dark:text-[#e4e6eb]">
          {activeConversation.name}
        </h4>
        <p className="text-[12px] text-[#65676b] dark:text-[#b0b3b8] mt-0.5">
          {formatLastSeen(activeConversation.lastSeen, activeConversation.online)}
        </p>

        {/* 3 Messenger Quick Action Circular Buttons */}
        <div className="flex items-center justify-center space-x-6 mt-4">
          <div className="flex flex-col items-center">
            <button className="w-9 h-9 rounded-full bg-[#f0f2f5] dark:bg-[#3a3b3c] hover:bg-[#e4e6eb] dark:hover:bg-[#4e4f50] flex items-center justify-center text-[#050505] dark:text-[#e4e6eb] transition-colors">
              <User className="w-4 h-4" />
            </button>
            <span className="text-[12px] text-[#050505] dark:text-[#e4e6eb] mt-1">
              Trang cá nhân
            </span>
          </div>

          <div className="flex flex-col items-center">
            <button
              onClick={() => setIsMuted(prev => !prev)}
              className="w-9 h-9 rounded-full bg-[#f0f2f5] dark:bg-[#3a3b3c] hover:bg-[#e4e6eb] dark:hover:bg-[#4e4f50] flex items-center justify-center text-[#050505] dark:text-[#e4e6eb] transition-colors"
            >
              {isMuted ? <BellOff className="w-4 h-4 text-[#e41e3f]" /> : <Bell className="w-4 h-4" />}
            </button>
            <span className="text-[12px] text-[#050505] dark:text-[#e4e6eb] mt-1">
              {isMuted ? 'Bật thông báo' : 'Tắt thông báo'}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <button className="w-9 h-9 rounded-full bg-[#f0f2f5] dark:bg-[#3a3b3c] hover:bg-[#e4e6eb] dark:hover:bg-[#4e4f50] flex items-center justify-center text-[#050505] dark:text-[#e4e6eb] transition-colors">
              <Search className="w-4 h-4" />
            </button>
            <span className="text-[12px] text-[#050505] dark:text-[#e4e6eb] mt-1">
              Tìm kiếm
            </span>
          </div>
        </div>
      </div>

      {/* Accordion Sections */}
      <div className="px-2 space-y-0.5 text-[14px] font-semibold text-[#050505] dark:text-[#e4e6eb]">
        {/* Section 1: Tùy chỉnh đoạn chat */}
        <div>
          <button
            onClick={() => setOpenCustomize(prev => !prev)}
            className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-[#f2f2f2] dark:hover:bg-[#242526] transition-colors"
          >
            <span>Tùy chỉnh đoạn chat</span>
            {openCustomize ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {openCustomize && (
            <div className="pl-2 pr-1 py-1 space-y-0.5 font-medium">
              <button
                onClick={() => setShowColorPicker(prev => !prev)}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-[#f2f2f2] dark:hover:bg-[#242526] transition-colors"
              >
                <div
                  style={{ backgroundColor: activeConversation.theme || '#0084FF' }}
                  className="w-5 h-5 rounded-full flex-shrink-0"
                />
                <span>Đổi chủ đề</span>
              </button>

              {showColorPicker && (
                <div className="flex items-center space-x-3 p-3 bg-[#f0f2f5] dark:bg-[#242526] rounded-xl mx-2 my-1">
                  {THEME_COLORS.map(t => (
                    <button
                      key={t.color}
                      onClick={() => {
                        updateTheme(t.color, null);
                        setShowColorPicker(false);
                      }}
                      style={{ backgroundColor: t.color }}
                      className="w-7 h-7 rounded-full shadow-sm hover:scale-110 transition-transform"
                      title={t.name}
                    />
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowEmojiPicker(prev => !prev)}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-[#f2f2f2] dark:hover:bg-[#242526] transition-colors"
              >
                <span className="text-lg w-5 text-center">{activeConversation.quickEmoji || '👍'}</span>
                <span>Thay đổi biểu tượng cảm xúc</span>
              </button>

              {showEmojiPicker && (
                <div className="grid grid-cols-4 gap-2 p-3 bg-[#f0f2f5] dark:bg-[#242526] rounded-xl mx-2 my-1">
                  {QUICK_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => {
                        updateTheme(null, emoji);
                        setShowEmojiPicker(false);
                      }}
                      className="text-2xl p-1 hover:scale-110 transition-transform rounded hover:bg-gray-200 dark:hover:bg-[#3a3b3c]"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 2: File phương tiện, file và liên kết */}
        <div>
          <button
            onClick={() => setOpenMedia(prev => !prev)}
            className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-[#f2f2f2] dark:hover:bg-[#242526] transition-colors"
          >
            <span>File phương tiện ({sharedImages.length})</span>
            {openMedia ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {openMedia && (
            <div className="px-3 py-2 font-normal">
              {sharedImages.length === 0 ? (
                <p className="text-xs text-[#65676b] dark:text-[#b0b3b8] py-3 text-center">
                  Chưa có file phương tiện nào
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {sharedImages.map(img => (
                    <div
                      key={img.id}
                      onClick={() => setLightboxMedia(img.fileUrl)}
                      className="aspect-square rounded-lg overflow-hidden bg-[#f0f2f5] dark:bg-[#242526] cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      <img
                        src={img.fileUrl}
                        alt="shared"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 3: Quyền riêng tư và hỗ trợ */}
        <div>
          <button
            onClick={() => setOpenPrivacy(prev => !prev)}
            className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-[#f2f2f2] dark:hover:bg-[#242526] transition-colors"
          >
            <span>Quyền riêng tư & hỗ trợ</span>
            {openPrivacy ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {openPrivacy && (
            <div className="pl-2 pr-1 py-1 space-y-0.5 font-medium">
              <div className="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-[#65676b] dark:text-[#b0b3b8] text-xs">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>Tin nhắn được bảo mật theo chuẩn giao thức thời gian thực.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
