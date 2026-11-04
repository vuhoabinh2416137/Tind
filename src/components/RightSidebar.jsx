import React, { useState } from 'react';
import { Palette, Smile, Image, Bell, BellOff, X, Sparkles } from 'lucide-react';
import { useChat } from '../context/ChatContext';
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
    setIsRightSidebarOpen,
    setLightboxMedia
  } = useChat();

  const [isMuted, setIsMuted] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  if (!activeConversation) return null;

  // Filter shared images
  const sharedImages = messages.filter(m => m.type === 'image' && !m.isUnsent && m.fileUrl);

  return (
    <div className="w-72 md:w-80 h-full bg-white dark:bg-[#18191a] border-l border-gray-200 dark:border-[#2f3031] flex flex-col select-none overflow-y-auto">
      {/* Top Header */}
      <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-[#2f3031]">
        <h3 className="font-bold text-gray-900 dark:text-white text-base">
          Thông tin đoạn chat
        </h3>
        <button
          onClick={() => setIsRightSidebarOpen(false)}
          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-[#28292a] text-gray-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Contact Profile Overview */}
      <div className="p-6 flex flex-col items-center text-center border-b border-gray-100 dark:border-[#2f3031]">
        <div className="relative mb-3">
          <img
            src={activeConversation.avatar}
            alt={activeConversation.name}
            className="w-20 h-20 rounded-full object-cover shadow-sm"
          />
          {activeConversation.online && (
            <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-[#18191a] rounded-full"></span>
          )}
        </div>
        <h4 className="font-bold text-lg text-gray-900 dark:text-white">
          {activeConversation.name}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {formatLastSeen(activeConversation.lastSeen, activeConversation.online)}
        </p>

        {/* Quick Action Buttons */}
        <div className="flex items-center space-x-4 mt-4">
          <button
            onClick={() => setIsMuted(prev => !prev)}
            className="flex flex-col items-center group"
          >
            <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-[#28292a] group-hover:bg-gray-200 dark:group-hover:bg-[#38393a] flex items-center justify-center text-gray-700 dark:text-gray-300 transition-colors">
              {isMuted ? <BellOff className="w-4 h-4 text-red-500" /> : <Bell className="w-4 h-4" />}
            </div>
            <span className="text-[11px] text-gray-500 mt-1">
              {isMuted ? 'Bật âm' : 'Tắt âm'}
            </span>
          </button>
        </div>
      </div>

      {/* Chat Customization */}
      <div className="p-4 border-b border-gray-100 dark:border-[#2f3031]">
        <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          Tùy chỉnh đoạn chat
        </h5>

        {/* Change Theme */}
        <div className="mb-2">
          <button
            onClick={() => setShowColorPicker(prev => !prev)}
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-[#242526] text-sm text-gray-700 dark:text-gray-200 transition-colors"
          >
            <div className="flex items-center space-x-2.5">
              <div
                style={{ backgroundColor: activeConversation.theme || '#0084FF' }}
                className="w-5 h-5 rounded-full shadow-sm"
              />
              <span>Đổi chủ đề màu sắc</span>
            </div>
            <Palette className="w-4 h-4 text-gray-400" />
          </button>

          {showColorPicker && (
            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-[#242526] rounded-xl mt-1 animate-pop-in">
              {THEME_COLORS.map(t => (
                <button
                  key={t.color}
                  onClick={() => {
                    updateTheme(t.color, null);
                    setShowColorPicker(false);
                  }}
                  style={{ backgroundColor: t.color }}
                  className="w-7 h-7 rounded-full shadow-md hover:scale-115 active:scale-95 transition-transform"
                  title={t.name}
                />
              ))}
            </div>
          )}
        </div>

        {/* Change Quick Emoji */}
        <div>
          <button
            onClick={() => setShowEmojiPicker(prev => !prev)}
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-[#242526] text-sm text-gray-700 dark:text-gray-200 transition-colors"
          >
            <div className="flex items-center space-x-2.5">
              <span className="text-lg">{activeConversation.quickEmoji || '👍'}</span>
              <span>Đổi biểu tượng cảm xúc</span>
            </div>
            <Smile className="w-4 h-4 text-gray-400" />
          </button>

          {showEmojiPicker && (
            <div className="grid grid-cols-4 gap-2 p-3 bg-gray-50 dark:bg-[#242526] rounded-xl mt-1 animate-pop-in">
              {QUICK_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    updateTheme(null, emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="text-2xl p-1 hover:scale-120 transition-transform rounded hover:bg-gray-200 dark:hover:bg-[#38393a]"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Shared Media Gallery */}
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Image className="w-3.5 h-3.5" /> File phương tiện ({sharedImages.length})
          </h5>
        </div>

        {sharedImages.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">
            Chưa có hình ảnh nào được gửi
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {sharedImages.map(img => (
              <div
                key={img.id}
                onClick={() => setLightboxMedia(img.fileUrl)}
                className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-[#242526] cursor-pointer hover:opacity-90 transition-opacity"
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
    </div>
  );
}
