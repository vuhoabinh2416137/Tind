import React, { useState } from 'react';
import { MessageCircle, Sparkles, User, AtSign, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { useChat } from '../context/ChatContext';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150'
];

export default function AuthModal() {
  const { currentUser, login, register, allUsers, switchUser } = useChat();

  const [mode, setMode] = useState('register'); // 'register' or 'login'
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // If already logged in, do not show modal
  if (currentUser) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        if (!username.trim()) {
          throw new Error('Vui lòng nhập tên người dùng (@username)');
        }
        await login(username.trim());
      } else {
        if (!name.trim()) {
          throw new Error('Vui lòng nhập tên hiển thị của bạn');
        }
        if (!username.trim()) {
          throw new Error('Vui lòng chọn tên người dùng (@username)');
        }
        await register({
          name: name.trim(),
          username: username.trim(),
          avatar: selectedAvatar
        });
      }
    } catch (err) {
      setError(err.message || 'Đã có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-pop-in select-none">
      <div className="bg-white dark:bg-[#242526] rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-[#393a3b] overflow-hidden">
        {/* Top Gradient Banner */}
        <div className="p-6 bg-gradient-to-r from-messenger-gradientStart to-messenger-gradientEnd text-white text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg mb-3">
            <MessageCircle className="w-8 h-8 fill-current text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Messenger Web</h2>
          <p className="text-xs text-blue-100 mt-1 max-w-xs">
            Trải nghiệm nhắn tin thời gian thực với Spring Boot 3 & React 18!
          </p>
        </div>

        {/* Tab switch: Register vs Login */}
        <div className="flex border-b border-gray-100 dark:border-[#393a3b] bg-gray-50 dark:bg-[#1e1f20]">
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); }}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${
              mode === 'register'
                ? 'text-messenger-blue border-b-2 border-messenger-blue bg-white dark:bg-[#242526]'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Tạo tài khoản mới
          </button>
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${
              mode === 'login'
                ? 'text-messenger-blue border-b-2 border-messenger-blue bg-white dark:bg-[#242526]'
                : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            Đăng nhập bằng @username
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center space-x-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'register' && (
            <>
              {/* Display Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Tên hiển thị của bạn
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 absolute left-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Minh Khang, Lan Anh..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#1e1f20] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-messenger-blue/40"
                  />
                </div>
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Chọn ảnh đại diện Avatar
                </label>
                <div className="flex items-center space-x-2.5 overflow-x-auto py-1 no-scrollbar">
                  {PRESET_AVATARS.map((avatar, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedAvatar(avatar)}
                      className={`relative rounded-full flex-shrink-0 transition-transform ${
                        selectedAvatar === avatar
                          ? 'ring-4 ring-messenger-blue scale-105'
                          : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                    >
                      <img
                        src={avatar}
                        alt="avatar"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      {selectedAvatar === avatar && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-messenger-blue text-white rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Tên người dùng (@username)
            </label>
            <div className="relative flex items-center">
              <AtSign className="w-4 h-4 absolute left-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="ví_dụ: minhanh99"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#1e1f20] border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-messenger-blue/40"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Dùng để bạn bè tìm kiếm và kết nối với bạn trên mạng.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-messenger-blue hover:bg-messenger-blueHover text-white rounded-xl text-sm font-semibold transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{mode === 'register' ? 'Bắt đầu sử dụng' : 'Đăng nhập'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Quick Access */}
        <div className="p-4 bg-gray-50 dark:bg-[#1e1f20] border-t border-gray-100 dark:border-[#393a3b] text-center">
          <p className="text-[11px] text-gray-500 mb-2 flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Hoặc đăng nhập nhanh bằng tài khoản có sẵn:
          </p>
          <div className="flex items-center justify-center space-x-2">
            {allUsers.slice(0, 3).map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => switchUser(u)}
                className="px-2.5 py-1 bg-white dark:bg-[#28292a] hover:border-messenger-blue border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors shadow-sm flex items-center space-x-1.5"
              >
                <img src={u.avatar} alt={u.name} className="w-4 h-4 rounded-full object-cover" />
                <span>{u.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
