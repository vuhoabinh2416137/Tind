import React from 'react';
import { useChat } from '../context/ChatContext';

export default function ActiveContactsTray() {
  const { allUsers, currentUser, startConversationWithUser } = useChat();

  const otherUsers = (Array.isArray(allUsers) ? allUsers : []).filter(u => u.id !== currentUser?.id);

  return (
    <div className="py-2 px-3 flex items-center space-x-3 overflow-x-auto no-scrollbar border-b border-gray-100 dark:border-[#2f3031]">
      {otherUsers.map(user => (
        <button
          key={user.id}
          onClick={() => startConversationWithUser(user.id)}
          className="flex flex-col items-center flex-shrink-0 group focus:outline-none"
          title={`Nhắn tin với ${user.name}`}
        >
          <div className="relative">
            <div className="w-12 h-12 rounded-full p-[2px] border-2 border-messenger-blue group-hover:scale-105 transition-transform duration-200">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            {user.online && (
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-[#18191a] rounded-full"></span>
            )}
          </div>
          <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300 mt-1 max-w-[54px] truncate text-center">
            {(user.name || '').split(' ').slice(-1)[0] || 'User'}
          </span>
        </button>
      ))}
    </div>
  );
}
