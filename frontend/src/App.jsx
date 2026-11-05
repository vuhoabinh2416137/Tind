import React, { useState } from 'react';
import { MessageCircle, Users, Archive, Moon, Sun, LogOut } from 'lucide-react';
import { ChatProvider, useChat, getDefaultAvatar } from './context/ChatContext';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import RightSidebar from './components/RightSidebar';
import MediaLightbox from './components/MediaLightbox';
import AuthModal, { MessengerLogo } from './components/AuthModal';

function NavigationRail({ activeTab, setActiveTab }) {
  const { currentUser, isDarkMode, toggleTheme, logout, conversations } = useChat();

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <aside className="w-[60px] h-full bg-white dark:bg-[#18191a] border-r border-[#e5e7eb] dark:border-[#2f3031] flex flex-col items-center justify-between py-3 select-none flex-shrink-0 z-20">
      {/* Top Icons */}
      <div className="flex flex-col items-center space-y-2">
        <div className="mb-2 p-1.5 cursor-pointer" onClick={() => setActiveTab('chats')} title="Messenger">
          <MessengerLogo className="w-7 h-7" />
        </div>

        {/* Chats Tab */}
        <button
          onClick={() => setActiveTab('chats')}
          className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
            activeTab === 'chats'
              ? 'bg-[#f0f2f5] dark:bg-[#242526] text-[#0084FF]'
              : 'text-[#65676b] dark:text-[#b0b3b8] hover:bg-[#f0f2f5] dark:hover:bg-[#242526]'
          }`}
          title="Đoạn chat"
        >
          <MessageCircle className={`w-5 h-5 ${activeTab === 'chats' ? 'fill-current' : ''}`} />
          {totalUnread > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-[#e41e3f] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-[#18191a]">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </button>

        {/* People Tab */}
        <button
          onClick={() => setActiveTab('people')}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
            activeTab === 'people'
              ? 'bg-[#f0f2f5] dark:bg-[#242526] text-[#0084FF]'
              : 'text-[#65676b] dark:text-[#b0b3b8] hover:bg-[#f0f2f5] dark:hover:bg-[#242526]'
          }`}
          title="Mọi người"
        >
          <Users className="w-5 h-5" />
        </button>

        {/* Archive Tab */}
        <button
          onClick={() => setActiveTab('archive')}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
            activeTab === 'archive'
              ? 'bg-[#f0f2f5] dark:bg-[#242526] text-[#0084FF]'
              : 'text-[#65676b] dark:text-[#b0b3b8] hover:bg-[#f0f2f5] dark:hover:bg-[#242526]'
          }`}
          title="Kho lưu trữ"
        >
          <Archive className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Controls: Theme Toggle, User Avatar & Logout */}
      <div className="flex flex-col items-center space-y-2.5">
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full flex items-center justify-center text-[#65676b] dark:text-[#b0b3b8] hover:bg-[#f0f2f5] dark:hover:bg-[#242526] transition-colors"
          title={isDarkMode ? 'Chế độ sáng' : 'Chế độ tối'}
        >
          {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
        </button>

        {currentUser && (
          <>
            <div className="relative group" title={`${currentUser.name} (@${currentUser.username})`}>
              <img
                src={currentUser.avatar || getDefaultAvatar(currentUser.name)}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-700"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#31a24c] border-2 border-white dark:border-[#18191a] rounded-full" />
            </div>

            <button
              onClick={logout}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#65676b] dark:text-[#b0b3b8] hover:text-[#e41e3f] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

function MainLayout() {
  const { currentUser, isRightSidebarOpen } = useChat();
  const [activeTab, setActiveTab] = useState('chats');

  if (!currentUser) {
    return <AuthModal />;
  }

  return (
    <div className="h-screen w-screen flex bg-white dark:bg-[#18191a] text-[#050505] dark:text-[#e4e6eb] overflow-hidden">
      {/* Leftmost Messenger Navigation Rail */}
      <NavigationRail activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Left Sidebar: Conversations & Contacts */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Center: Main Chat Window */}
      <ChatArea />

      {/* Right: Info & Media Drawer */}
      {isRightSidebarOpen && <RightSidebar />}

      {/* Media Lightbox Overlay */}
      <MediaLightbox />
    </div>
  );
}

export default function App() {
  return (
    <ChatProvider>
      <MainLayout />
    </ChatProvider>
  );
}
