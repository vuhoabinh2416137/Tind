import React, { useState, useRef } from 'react';
import { Search, SquarePen, X } from 'lucide-react';
import { useChat, getDefaultAvatar } from '../context/ChatContext';
import ActiveContactsTray from './ActiveContactsTray';
import { formatConversationTime } from '../utils/date';

export default function Sidebar({ activeTab = 'chats', setActiveTab }) {
  const {
    conversations,
    activeConversation,
    selectConversation,
    currentUser,
    allUsers,
    searchQuery,
    setSearchQuery,
    searchResults,
    startConversationWithUser
  } = useChat();

  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'unread'
  const searchInputRef = useRef(null);

  const filteredConversations = conversations.filter(c => {
    const matchesSearch =
      (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.lastMessage?.text && c.lastMessage.text.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    if (filterMode === 'unread') return (c.unreadCount || 0) > 0;
    return true;
  });

  const existingParticipantIds = conversations.map(c =>
    c.participants?.find(p => p !== currentUser?.id)
  );
  const newDiscoveries = searchResults.filter(u => !existingParticipantIds.includes(u.id));
  const otherUsers = (Array.isArray(allUsers) ? allUsers : []).filter(u => u.id !== currentUser?.id);

  return (
    <div className="w-80 md:w-[360px] h-full flex flex-col bg-white dark:bg-[#18191a] border-r border-[#e5e7eb] dark:border-[#2f3031] select-none flex-shrink-0">
      {/* Top Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <h1 className="text-[24px] font-bold tracking-tight text-[#050505] dark:text-[#e4e6eb]">
          {activeTab === 'people' ? 'Mọi người' : activeTab === 'archive' ? 'Kho lưu trữ' : 'Đoạn chat'}
        </h1>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              if (setActiveTab) setActiveTab('chats');
              searchInputRef.current?.focus();
            }}
            className="w-9 h-9 rounded-full bg-[#f0f2f5] hover:bg-[#e4e6eb] dark:bg-[#3a3b3c] dark:hover:bg-[#4e4f50] flex items-center justify-center text-[#050505] dark:text-[#e4e6eb] transition-colors"
            title="Tin nhắn mới"
          >
            <SquarePen className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-1.5">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-[#65676b] dark:text-[#b0b3b8] pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm trên Messenger"
            className="w-full pl-10 pr-8 py-2 bg-[#f0f2f5] dark:bg-[#3a3b3c] text-[#050505] dark:text-[#e4e6eb] placeholder-[#65676b] dark:placeholder-[#b0b3b8] rounded-full text-[15px] focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-200"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Pills (Inbox / Unread) */}
      {activeTab === 'chats' && (
        <div className="px-4 py-2 flex items-center space-x-2">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3.5 py-1.5 rounded-full text-[14px] font-semibold transition-colors ${
              filterMode === 'all'
                ? 'bg-[#ebf5ff] text-[#0084FF] dark:bg-[#252f3e] dark:text-[#4599ff]'
                : 'text-[#65676b] dark:text-[#b0b3b8] hover:bg-[#f0f2f5] dark:hover:bg-[#3a3b3c]'
            }`}
          >
            Hộp thư
          </button>
          <button
            onClick={() => setFilterMode('unread')}
            className={`px-3.5 py-1.5 rounded-full text-[14px] font-semibold transition-colors ${
              filterMode === 'unread'
                ? 'bg-[#ebf5ff] text-[#0084FF] dark:bg-[#252f3e] dark:text-[#4599ff]'
                : 'text-[#65676b] dark:text-[#b0b3b8] hover:bg-[#f0f2f5] dark:hover:bg-[#3a3b3c]'
            }`}
          >
            Chưa đọc
          </button>
        </div>
      )}

      {/* Active Contacts Stories Tray */}
      {activeTab === 'chats' && <ActiveContactsTray />}

      {/* Main List Area */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {activeTab === 'people' ? (
          <div className="px-2 py-2 space-y-1">
            <p className="text-xs font-semibold text-[#65676b] dark:text-[#b0b3b8] px-2 mb-2">
              Người dùng trên Messenger ({otherUsers.length})
            </p>
            {otherUsers.length === 0 ? (
              <div className="p-8 text-center text-[#65676b] dark:text-[#b0b3b8] text-sm">
                Chưa có người dùng nào khác
              </div>
            ) : (
              otherUsers.map(user => (
                <div
                  key={user.id}
                  onClick={() => {
                    startConversationWithUser(user.id);
                    if (setActiveTab) setActiveTab('chats');
                  }}
                  className="flex items-center space-x-3 p-2.5 rounded-xl hover:bg-[#f2f2f2] dark:hover:bg-[#242526] cursor-pointer transition-colors"
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={user.avatar || getDefaultAvatar(user.name)}
                      alt={user.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    {user.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#31a24c] border-2 border-white dark:border-[#18191a] rounded-full" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-[#050505] dark:text-[#e4e6eb] truncate">
                      {user.name}
                    </p>
                    <p className="text-[12px] text-[#65676b] dark:text-[#b0b3b8] truncate">
                      @{user.username}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            {/* Global Discovery Results when Searching */}
            {searchQuery.trim() && newDiscoveries.length > 0 && (
              <div className="mb-3 px-2">
                <p className="text-xs font-semibold text-[#65676b] dark:text-[#b0b3b8] mb-1.5 px-2">
                  Mọi người khác
                </p>
                <div className="space-y-0.5">
                  {newDiscoveries.map(user => (
                    <div
                      key={user.id}
                      onClick={() => {
                        startConversationWithUser(user.id);
                        setSearchQuery('');
                      }}
                      className="flex items-center space-x-3 p-2.5 rounded-xl hover:bg-[#f2f2f2] dark:hover:bg-[#242526] cursor-pointer transition-colors"
                    >
                      <img
                        src={user.avatar || getDefaultAvatar(user.name)}
                        alt={user.name}
                        className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-semibold text-[#050505] dark:text-[#e4e6eb] truncate">
                          {user.name}
                        </p>
                        <p className="text-[13px] text-[#65676b] dark:text-[#b0b3b8] truncate">
                          @{user.username || 'user'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredConversations.length === 0 && newDiscoveries.length === 0 ? (
              <div className="p-8 text-center text-[#65676b] dark:text-[#b0b3b8] text-[14px]">
                {searchQuery ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có cuộc trò chuyện nào. Hãy tìm kiếm bạn bè để bắt đầu nhắn tin.'}
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isActive = activeConversation?.id === conv.id;
                const hasUnread = (conv.unreadCount || 0) > 0;
                const lastMsg = conv.lastMessage;
                const isSender = lastMsg?.senderId === currentUser?.id;

                const previewText = lastMsg
                  ? `${isSender ? 'Bạn: ' : ''}${
                      lastMsg.isUnsent
                        ? 'Tin nhắn đã thu hồi'
                        : lastMsg.type === 'image'
                        ? 'Đã gửi một ảnh'
                        : lastMsg.type === 'like'
                        ? lastMsg.text
                        : lastMsg.text
                    }`
                  : 'Các bạn hiện đã được kết nối trên Messenger';

                return (
                  <div
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`flex items-center p-2.5 rounded-xl cursor-pointer transition-colors relative ${
                      isActive
                        ? 'bg-[#ebf5ff] dark:bg-[#252f3e]'
                        : 'hover:bg-[#f2f2f2] dark:hover:bg-[#242526]'
                    }`}
                  >
                    {/* Avatar 56x56 with online status */}
                    <div className="relative flex-shrink-0 mr-3">
                      <img
                        src={conv.avatar || getDefaultAvatar(conv.name)}
                        alt={conv.name || ''}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                      {conv.online && (
                        <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-[#31a24c] border-2 border-white dark:border-[#18191a] rounded-full" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 pr-2">
                      <h2
                        className={`text-[15px] truncate leading-snug ${
                          hasUnread
                            ? 'font-bold text-[#050505] dark:text-white'
                            : 'font-medium text-[#050505] dark:text-[#e4e6eb]'
                        }`}
                      >
                        {conv.name || 'Người dùng'}
                      </h2>

                      <div className="flex items-center text-[13px] mt-0.5">
                        <span
                          className={`truncate ${
                            hasUnread
                              ? 'font-bold text-[#050505] dark:text-white'
                              : 'text-[#65676b] dark:text-[#b0b3b8]'
                          }`}
                        >
                          {previewText}
                        </span>
                        {lastMsg && (
                          <span className="text-[#65676b] dark:text-[#b0b3b8] flex-shrink-0 ml-1">
                            · {formatConversationTime(lastMsg.createdAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Unread Blue Dot or Seen Mini Avatar */}
                    <div className="flex-shrink-0 ml-1 flex items-center">
                      {hasUnread ? (
                        <span className="w-3 h-3 rounded-full bg-[#0084FF]" />
                      ) : (
                        isSender && lastMsg?.seenBy?.length > 1 && (
                          <img
                            src={conv.avatar || getDefaultAvatar(conv.name)}
                            alt="seen"
                            className="w-4 h-4 rounded-full object-cover"
                            title="Đã xem"
                          />
                        )
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}
