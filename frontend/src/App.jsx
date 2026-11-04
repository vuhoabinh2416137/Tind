import React from 'react';
import { ChatProvider, useChat } from './context/ChatContext';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import RightSidebar from './components/RightSidebar';
import UserSwitcherModal from './components/UserSwitcherModal';
import MediaLightbox from './components/MediaLightbox';
import AuthModal from './components/AuthModal';

function MainLayout() {
  const { isRightSidebarOpen } = useChat();

  return (
    <div className="h-screen w-screen flex bg-white dark:bg-[#18191a] text-gray-900 dark:text-[#e4e6eb] overflow-hidden">
      {/* Left Sidebar: Conversations & Contacts */}
      <Sidebar />

      {/* Center: Main Chat Window */}
      <ChatArea />

      {/* Right: Info & Media Drawer */}
      {isRightSidebarOpen && <RightSidebar />}

      {/* Modals & Overlays */}
      <AuthModal />
      <UserSwitcherModal />
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
