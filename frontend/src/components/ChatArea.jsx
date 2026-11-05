import React, { useState } from 'react';
import { Phone, Video, Info } from 'lucide-react';
import { useChat, getDefaultAvatar } from '../context/ChatContext';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { formatLastSeen } from '../utils/date';
import { MessengerLogo } from './AuthModal';

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
      <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-[#18191a] text-center p-6 select-none">
        <div className="mb-4">
          <MessengerLogo className="w-20 h-20 opacity-90" />
        </div>
        <h3 className="text-[20px] font-bold text-[#050505] dark:text-[#e4e6eb]">
          Chưa chọn đoạn chat nào
        </h3>
        <p className="text-[14px] text-[#65676b] dark:text-[#b0b3b8] mt-1 max-w-xs">
          Chọn một cuộc trò chuyện từ danh sách hoặc tìm kiếm người dùng để bắt đầu nhắn tin.
        </p>
      </div>
    );
  }

  const convTheme = activeConversation.theme || '#0084FF';

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#18191a] relative overflow-hidden">
      {/* Call notification banner */}
      {callToast && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 bg-gray-900/90 text-white text-xs font-semibold rounded-full shadow-2xl backdrop-blur-md animate-pop-in flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#31a24c] animate-ping" />
          {callToast}
        </div>
      )}

      {/* Messenger Chat Header (60px) */}
      <div className="h-[60px] px-4 flex items-center justify-between border-b border-[#e5e7eb] dark:border-[#2f3031] bg-white dark:bg-[#18191a] shadow-[0_1px_2px_rgba(0,0,0,0.04)] z-10 flex-shrink-0">
        {/* Contact Info */}
        <div className="flex items-center space-x-3 min-w-0 cursor-pointer hover:bg-[#f2f2f2] dark:hover:bg-[#242526] p-1.5 -ml-1.5 rounded-xl transition-colors">
          <div className="relative flex-shrink-0">
            <img
              src={activeConversation.avatar || getDefaultAvatar(activeConversation.name)}
              alt={activeConversation.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            {activeConversation.online && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#31a24c] border-2 border-white dark:border-[#18191a] rounded-full" />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-[#050505] dark:text-[#e4e6eb] truncate leading-tight">
              {activeConversation.name}
            </h2>
            <p className="text-[12px] text-[#65676b] dark:text-[#b0b3b8] truncate leading-tight mt-0.5">
              {formatLastSeen(activeConversation.lastSeen, activeConversation.online)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => startCall('audio')}
            style={{ color: convTheme }}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f2f2f2] dark:hover:bg-[#28292a] transition-colors"
            title="Bắt đầu cuộc gọi thoại"
          >
            <Phone className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={() => startCall('video')}
            style={{ color: convTheme }}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f2f2f2] dark:hover:bg-[#28292a] transition-colors"
            title="Bắt đầu cuộc gọi video"
          >
            <Video className="w-5 h-5 fill-current" />
          </button>

          <button
            onClick={() => setIsRightSidebarOpen(prev => !prev)}
            style={{ color: convTheme }}
            className={`w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f2f2f2] dark:hover:bg-[#28292a] transition-colors ${
              isRightSidebarOpen ? 'bg-[#ebf5ff] dark:bg-[#252f3e]' : ''
            }`}
            title="Thông tin về cuộc trò chuyện"
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
