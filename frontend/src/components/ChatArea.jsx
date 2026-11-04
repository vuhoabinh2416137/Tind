import React, { useState } from 'react';
import { Phone, Video, Info, MessageSquare, Sparkles } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { formatLastSeen } from '../utils/date';

export default function ChatArea() {
  const {
    activeConversation,
    isRightSidebarOpen,
    setIsRightSidebarOpen
  } = useChat();

  const [callToast, setCallToast] = useState(null);

  const startCall = (type) => {
    setCallToast(`Đang kết nối cuộc gọi ${type === 'video' ? 'video' : 'thoại'} với ${activeConversation.name}...`);
    setTimeout(() => {
      setCallToast(null);
    }, 3500);
  };

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-[#18191a] text-center p-6 select-none">
        <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-[#252f3e] flex items-center justify-center text-messenger-blue mb-4 shadow-sm">
          <MessageSquare className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
          Chọn một đoạn chat
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm">
          Nhấp vào danh sách bên trái hoặc chọn bạn bè trên thanh trên cùng để bắt đầu nhắn tin thời gian thực!
        </p>
      </div>
    );
  }

  const convTheme = activeConversation.theme || '#0084FF';

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#18191a] relative overflow-hidden">
      {/* Call simulation notification banner */}
      {callToast && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 bg-gray-900/90 text-white text-xs font-semibold rounded-full shadow-2xl backdrop-blur-md animate-pop-in flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
          {callToast}
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-[#2f3031] bg-white/80 dark:bg-[#18191a]/80 backdrop-blur-md z-10">
        {/* Contact Info */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="relative flex-shrink-0">
            <img
              src={activeConversation.avatar}
              alt={activeConversation.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            {activeConversation.online && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#18191a] rounded-full"></span>
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate flex items-center gap-1.5">
              {activeConversation.name}
              {activeConversation.isBot && (
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              )}
            </h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
              {formatLastSeen(activeConversation.lastSeen, activeConversation.online)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => startCall('audio')}
            style={{ color: convTheme }}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#28292a] transition-colors"
            title="Bắt đầu cuộc gọi thoại"
          >
            <Phone className="w-5 h-5" />
          </button>

          <button
            onClick={() => startCall('video')}
            style={{ color: convTheme }}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#28292a] transition-colors"
            title="Bắt đầu cuộc gọi video"
          >
            <Video className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsRightSidebarOpen(prev => !prev)}
            style={{ color: convTheme }}
            className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#28292a] transition-colors ${
              isRightSidebarOpen ? 'bg-blue-50 dark:bg-[#252f3e]' : ''
            }`}
            title="Thông tin đoạn chat"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Message Feed */}
      <MessageList />

      {/* Chat Input */}
      <ChatInput />
    </div>
  );
}
