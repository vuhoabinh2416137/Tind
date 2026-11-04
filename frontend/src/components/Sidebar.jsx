import React from 'react';
import { Search, Moon, Sun, Users, MessageCircle, LogOut, MessageSquarePlus } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import ActiveContactsTray from './ActiveContactsTray';
import { formatConversationTime } from '../utils/date';

export default function Sidebar() {
  const {
    conversations,
    activeConversation,
    selectConversation,
    currentUser,
    isDarkMode,
    toggleTheme,
    setIsUserSwitcherOpen,
    searchQuery,
    setSearchQuery,
    searchResults,
    startConversationWithUser,
    logout
  } = useChat();

  const filteredConversations = conversations.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.lastMessage?.text && c.lastMessage.text.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Filter global search results to exclude existing conversations
  const existingParticipantIds = conversations.map(c => 
    c.participants?.find(p => p !== currentUser?.id)
  );
  const newDiscoveries = searchResults.filter(u => !existingParticipantIds.includes(u.id));

  return (
    <div className="w-80 md:w-96 h-full flex flex-col bg-white dark:bg-[#18191a] border-r border-gray-200 dark:border-[#2f3031] select-none flex-shrink-0">
      {/* Top Header */}
      <div className="p-4 pb-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 rounded-full bg-messenger-blue flex items-center justify-center text-white shadow-md">
            <MessageCircle className="w-5 h-5 fill-current" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Đoạn chat
          </h1>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setIsUserSwitcherOpen(true)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#28292a] text-gray-600 dark:text-gray-300 transition-colors relative"
            title="Đổi tài khoản kiểm thử"
          >
            <Users className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-messenger-blue text-[10px] text-white font-bold rounded-full">
              Demo
            </span>
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#28292a] text-gray-600 dark:text-gray-300 transition-colors"
            title={isDarkMode ? 'Chế độ sáng' : 'Chế độ tối'}
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-2">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm bạn bè (@username, tên)..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-[#242526] text-gray-900 dark:text-gray-100 placeholder-gray-500 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-messenger-blue/40 transition-all"
          />
        </div>
      </div>

      {/* Active Contacts Stories Tray */}
      <ActiveContactsTray />

      {/* Main Conversation & Discovery List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {/* Global Discovery Results when Searching */}
        {searchQuery.trim() && newDiscoveries.length > 0 && (
          <div className="mb-3 px-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Tìm thấy trên mạng ({newDiscoveries.length})
            </p>
            <div className="space-y-1">
              {newDiscoveries.map(user => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-blue-50/50 dark:bg-[#222a38] border border-blue-100 dark:border-blue-900/30"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                        {user.name}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                        @{user.username || 'user'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      startConversationWithUser(user.id);
                      setSearchQuery('');
                    }}
                    className="px-2.5 py-1 bg-messenger-blue text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity flex items-center space-x-1 flex-shrink-0"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                    <span>Nhắn</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredConversations.length === 0 && newDiscoveries.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            {searchQuery ? 'Không tìm thấy kết quả phù hợp' : 'Không có đoạn chat nào'}
          </div>
        ) : (
          filteredConversations.map(conv => {
            const isActive = activeConversation?.id === conv.id;
            const hasUnread = (conv.unreadCount || 0) > 0;
            const lastMsg = conv.lastMessage;
            const isSender = lastMsg?.senderId === currentUser?.id;

            return (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`flex items-center p-2.5 rounded-xl cursor-pointer transition-colors relative ${
                  isActive
                    ? 'bg-blue-50 dark:bg-[#252f3e]'
                    : 'hover:bg-gray-100 dark:hover:bg-[#242526]'
                }`}
              >
                {/* Avatar with online status */}
                <div className="relative flex-shrink-0 mr-3">
                  <img
                    src={conv.avatar}
                    alt={conv.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  {conv.online && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-[#18191a] rounded-full"></span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-baseline justify-between mb-0.5">
                    <h2
                      className={`text-sm truncate ${
                        hasUnread
                          ? 'font-bold text-gray-900 dark:text-white'
                          : 'font-medium text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {conv.name}
                    </h2>
                    {lastMsg && (
                      <span className="text-[11px] text-gray-400 ml-2 flex-shrink-0">
                        {formatConversationTime(lastMsg.createdAt)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <p
                      className={`text-xs truncate ${
                        hasUnread
                          ? 'font-semibold text-messenger-blue'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {lastMsg ? (
                        <>
                          {isSender && 'Bạn: '}
                          {lastMsg.isUnsent
                            ? 'Tin nhắn đã thu hồi'
                            : lastMsg.type === 'image'
                            ? '📷 Đã gửi một ảnh'
                            : lastMsg.type === 'like'
                            ? `${lastMsg.text} Biểu tượng cảm xúc`
                            : lastMsg.text}
                        </>
                      ) : (
                        'Bắt đầu cuộc trò chuyện'
                      )}
                    </p>

                    {/* Unread badge or Seen indicator */}
                    {hasUnread ? (
                      <span className="w-5 h-5 flex items-center justify-center bg-messenger-blue text-white text-[11px] font-bold rounded-full ml-1.5 flex-shrink-0">
                        {conv.unreadCount}
                      </span>
                    ) : (
                      isSender && lastMsg?.seenBy?.length > 1 && (
                        <img
                          src={conv.avatar}
                          alt="seen"
                          className="w-3.5 h-3.5 rounded-full ml-1.5 flex-shrink-0"
                          title="Đã xem"
                        />
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Current User Bottom Bar */}
      {currentUser && (
        <div className="p-3 border-t border-gray-200 dark:border-[#2f3031] flex items-center justify-between bg-gray-50 dark:bg-[#1e1f20]">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="relative flex-shrink-0">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border border-white dark:border-[#1e1f20] rounded-full"></span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                {currentUser.name}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                @{currentUser.username || 'user'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsUserSwitcherOpen(true)}
              className="px-2 py-1.5 bg-white dark:bg-[#2e2f30] hover:bg-gray-100 dark:hover:bg-[#38393a] border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors shadow-sm"
              title="Đổi tài khoản"
            >
              Tài khoản
            </button>
            <button
              onClick={logout}
              className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
