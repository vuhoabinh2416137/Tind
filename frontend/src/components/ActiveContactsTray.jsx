import React from 'react';
import { useChat, getDefaultAvatar } from '../context/ChatContext';

export default function ActiveContactsTray() {
  const { allUsers, currentUser, startConversationWithUser } = useChat();

  const otherUsers = (Array.isArray(allUsers) ? allUsers : []).filter(u => u.id !== currentUser?.id);

  if (otherUsers.length === 0) return null;

  return (
    <div className="py-2.5 px-4 flex items-center space-x-3.5 overflow-x-auto no-scrollbar">
      {otherUsers.map(user => (
        <button
          key={user.id}
          onClick={() => startConversationWithUser(user.id)}
          className="flex flex-col items-center flex-shrink-0 group focus:outline-none w-14"
          title={user.name}
        >
          <div className="relative">
            <img
              src={user.avatar || getDefaultAvatar(user.name)}
              alt={user.name}
              className="w-12 h-12 rounded-full object-cover group-hover:brightness-95 transition-all"
            />
            {user.online && (
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#31a24c] border-2 border-white dark:border-[#18191a] rounded-full" />
            )}
          </div>
          <span className="text-[12px] text-[#65676b] dark:text-[#b0b3b8] mt-1.5 w-full truncate text-center leading-tight">
            {(user.name || '').split(' ').slice(-1)[0] || 'User'}
          </span>
        </button>
      ))}
    </div>
  );
}
