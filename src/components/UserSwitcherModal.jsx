import React from 'react';
import { X, Check, UserCheck, Info } from 'lucide-react';
import { useChat } from '../context/ChatContext';

export default function UserSwitcherModal() {
  const {
    allUsers,
    currentUser,
    switchUser,
    isUserSwitcherOpen,
    setIsUserSwitcherOpen
  } = useChat();

  if (!isUserSwitcherOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-pop-in">
      <div className="bg-white dark:bg-[#242526] rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-[#393a3b] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-[#393a3b] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-messenger-blue" />
            <h3 className="font-bold text-gray-900 dark:text-white text-base">
              Chuyển đổi tài khoản kiểm thử
            </h3>
          </div>
          <button
            onClick={() => setIsUserSwitcherOpen(false)}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-[#3a3b3c] text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tip */}
        <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40 flex items-start space-x-2 text-xs text-blue-700 dark:text-blue-300">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            Bạn có thể đổi tài khoản tại đây để trải nghiệm tin nhắn 2 chiều ngay trên trình duyệt, hoặc mở tab ẩn danh / trình duyệt khác để chat song song thời gian thực!
          </p>
        </div>

        {/* Users List */}
        <div className="p-4 space-y-2">
          {allUsers.map((user) => {
            const isSelected = user.id === currentUser?.id;
            return (
              <button
                key={user.id}
                onClick={() => switchUser(user)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border ${
                  isSelected
                    ? 'bg-blue-50/80 dark:bg-[#252f3e] border-messenger-blue shadow-sm'
                    : 'hover:bg-gray-50 dark:hover:bg-[#2e2f30] border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-11 h-11 rounded-full object-cover"
                    />
                    {user.online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#242526] rounded-full"></span>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user.status || (user.isBot ? 'Bot Trợ lý AI' : 'Thành viên')}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-messenger-blue text-white flex items-center justify-center flex-shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-[#1e1f20] border-t border-gray-100 dark:border-[#393a3b] flex justify-end">
          <button
            onClick={() => setIsUserSwitcherOpen(false)}
            className="px-4 py-2 bg-messenger-blue text-white rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
