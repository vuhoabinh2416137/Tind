import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useChat } from '../context/ChatContext';

// Official Messenger Gradient SVG Logo
export const MessengerLogo = ({ className = 'w-10 h-10' }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className}>
    <defs>
      <linearGradient id="messengerGrad" x1="50%" x2="50%" y1="97.078%" y2="0%">
        <stop offset="0%" stopColor="#0062E0" />
        <stop offset="50%" stopColor="#A033FF" />
        <stop offset="100%" stopColor="#FF5280" />
      </linearGradient>
    </defs>
    <path
      fill="url(#messengerGrad)"
      d="M18 2C9.163 2 2 8.636 2 17.5c0 4.651 2.095 8.758 5.453 11.536.286.236.458.59.471.969l.099 3.025a1.5 1.5 0 002.11 1.324l3.376-1.49a1.495 1.495 0 011.003-.075c1.11.305 2.283.471 3.488.471 8.837 0 16-6.636 16-15.5S26.837 2 18 2z"
    />
    <path
      fill="#FFFFFF"
      d="M8.39 22.14l4.706-7.47a2.5 2.5 0 013.618-.666l3.82 2.865a1 1 0 001.205-.004l5.158-3.914c.688-.522 1.59.302 1.124 1.04l-4.707 7.47a2.5 2.5 0 01-3.618.666l-3.82-2.865a1 1 0 00-1.205.004l-5.158 3.914c-.688.522-1.59-.302-1.123-1.04z"
    />
  </svg>
);

export default function AuthModal() {
  const { currentUser, login, register } = useChat();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (currentUser) return null;

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        if (!username.trim()) {
          throw new Error('Vui lòng nhập email hoặc tên đăng nhập');
        }
        if (!password) {
          throw new Error('Vui lòng nhập mật khẩu');
        }
        await login(username.trim(), password);
      } else {
        if (!name.trim()) {
          throw new Error('Vui lòng nhập họ và tên hiển thị');
        }
        if (!username.trim() || username.trim().length < 3) {
          throw new Error('Tên đăng nhập phải có ít nhất 3 ký tự');
        }
        if (!password || password.length < 6) {
          throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
        }
        if (password !== confirmPassword) {
          throw new Error('Mật khẩu xác nhận không khớp');
        }
        await register({
          name: name.trim(),
          username: username.trim(),
          password
        });
      }
    } catch (err) {
      setError(err.message || 'Đã xảy ra lỗi, vui lòng thử lại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-[#18191a] z-50 flex flex-col overflow-y-auto select-none">
      {/* Messenger.com Official Header */}
      <header className="w-full max-w-7xl mx-auto px-6 md:px-12 h-24 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => switchMode('login')}>
          <MessengerLogo className="w-10 h-10" />
          <span className="text-xl font-bold tracking-tight text-[#050505] dark:text-white hidden sm:inline">
            Messenger
          </span>
        </div>

        <nav className="hidden md:flex items-center space-x-8 text-[15px] font-semibold text-[#050505] dark:text-[#e4e6eb]">
          <span className="cursor-pointer hover:underline decoration-2 underline-offset-8 decoration-[#0084FF]">
            Tính năng
          </span>
          <span className="cursor-pointer hover:underline decoration-2 underline-offset-8 decoration-[#0084FF]">
            Ứng dụng dành cho máy tính
          </span>
          <span className="cursor-pointer hover:underline decoration-2 underline-offset-8 decoration-[#0084FF]">
            Quyền riêng tư & an toàn
          </span>
          <span className="cursor-pointer hover:underline decoration-2 underline-offset-8 decoration-[#0084FF]">
            Dành cho nhà phát triển
          </span>
        </nav>
      </header>

      {/* Main Content Split Grid */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 md:px-12 py-6 md:py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Headline & Auth Form */}
        <div className="lg:col-span-6 max-w-md mx-auto lg:mx-0 w-full">
          <h1
            className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.08] mb-5 bg-clip-text text-transparent"
            style={{
              backgroundImage: 'linear-gradient(83.84deg, #0088FF -6.87%, #A033FF 26.54%, #FF5C87 58.58%)'
            }}
          >
            {mode === 'login' ? 'Tụ họp mọi lúc, mọi nơi' : 'Tạo tài khoản Messenger'}
          </h1>

          <p className="text-[16px] text-[#595959] dark:text-[#b0b3b8] mb-7 leading-relaxed">
            {mode === 'login'
              ? 'Với Messenger, việc kết nối với những người bạn yêu quý thật đơn giản và thú vị.'
              : 'Đăng ký tài khoản để bắt đầu trò chuyện và kết nối với bạn bè theo thời gian thực.'}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {error && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl flex items-center space-x-2.5 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Họ và tên hiển thị"
                  autoComplete="name"
                  className="w-full px-4 py-3.5 bg-[#f5f6f7] dark:bg-[#242526] border border-transparent focus:border-[#0084FF] rounded-xl text-[15px] text-[#050505] dark:text-white placeholder-[#65676b] dark:placeholder-[#b0b3b8] focus:outline-none transition-colors"
                />
              </div>
            )}

            <div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.@]/g, ''))}
                placeholder={mode === 'login' ? 'Email hoặc tên người dùng' : 'Tên người dùng (ví dụ: minhanh)'}
                autoComplete="username"
                className="w-full px-4 py-3.5 bg-[#f5f6f7] dark:bg-[#242526] border border-transparent focus:border-[#0084FF] rounded-xl text-[15px] text-[#050505] dark:text-white placeholder-[#65676b] dark:placeholder-[#b0b3b8] focus:outline-none transition-colors"
              />
            </div>

            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full pl-4 pr-11 py-3.5 bg-[#f5f6f7] dark:bg-[#242526] border border-transparent focus:border-[#0084FF] rounded-xl text-[15px] text-[#050505] dark:text-white placeholder-[#65676b] dark:placeholder-[#b0b3b8] focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3.5 text-[#65676b] hover:text-[#050505] dark:text-[#b0b3b8] dark:hover:text-white"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {mode === 'register' && (
              <div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  autoComplete="new-password"
                  className="w-full px-4 py-3.5 bg-[#f5f6f7] dark:bg-[#242526] border border-transparent focus:border-[#0084FF] rounded-xl text-[15px] text-[#050505] dark:text-white placeholder-[#65676b] dark:placeholder-[#b0b3b8] focus:outline-none transition-colors"
                />
              </div>
            )}

            {/* Submit & Action Row */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4">
              <button
                type="submit"
                disabled={isLoading}
                className="px-8 py-3.5 bg-[#0084FF] hover:bg-[#0073e6] active:scale-[0.98] text-white font-semibold text-[15px] rounded-full transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}</span>
              </button>

              <button
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
                className="text-sm font-semibold text-[#0084FF] hover:underline text-left sm:text-center"
              >
                {mode === 'login' ? 'Tạo tài khoản mới' : 'Đã có tài khoản? Đăng nhập'}
              </button>
            </div>

            {mode === 'login' && (
              <div className="pt-3 flex items-center space-x-2.5">
                <input
                  id="keepSignedIn"
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#0084FF] focus:ring-[#0084FF]"
                />
                <label
                  htmlFor="keepSignedIn"
                  className="text-[13px] text-[#65676b] dark:text-[#b0b3b8] cursor-pointer"
                >
                  Duy trì đăng nhập
                </label>
              </div>
            )}
          </form>
        </div>

        {/* Right Column: Authentic Messenger Preview Showcase */}
        <div className="hidden lg:flex lg:col-span-6 items-center justify-center">
          <div className="relative w-full max-w-lg">
            {/* Soft gradient aura */}
            <div
              className="absolute -inset-4 rounded-[36px] blur-2xl opacity-30 pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, #0084FF 0%, #A033FF 50%, #FF5280 100%)'
              }}
            />

            {/* Mockup Window */}
            <div className="relative bg-white dark:bg-[#242526] rounded-[28px] shadow-2xl border border-gray-100 dark:border-[#393a3b] p-6 space-y-5">
              {/* Mockup Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-[#393a3b]">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#0084FF] to-[#A033FF] flex items-center justify-center text-white font-bold text-base shadow-sm">
                    M
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#050505] dark:text-white">Messenger</p>
                    <p className="text-xs text-[#31a24c] font-medium flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#31a24c] inline-block" />
                      Đang hoạt động
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-full bg-[#f0f2f5] dark:bg-[#3a3b3c]" />
                  <div className="w-8 h-8 rounded-full bg-[#f0f2f5] dark:bg-[#3a3b3c]" />
                </div>
              </div>

              {/* Mockup Messages */}
              <div className="space-y-3 py-2">
                <div className="flex items-end space-x-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#0084FF] to-[#A033FF] flex-shrink-0" />
                  <div className="bg-[#f0f2f5] dark:bg-[#303030] text-[#050505] dark:text-[#e4e6eb] px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm max-w-xs">
                    Chào mừng bạn đến với giao diện Messenger! 👋
                  </div>
                </div>

                <div className="flex justify-end">
                  <div
                    className="text-white px-4 py-2.5 rounded-2xl rounded-br-sm text-sm max-w-xs shadow-sm"
                    style={{
                      background: 'linear-gradient(135deg, #0084FF 0%, #A033FF 100%)'
                    }}
                  >
                    Kết nối thời gian thực, bảo mật và tốc độ cao ✨
                  </div>
                </div>

                <div className="flex items-end space-x-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#0084FF] to-[#A033FF] flex-shrink-0" />
                  <div className="relative bg-[#f0f2f5] dark:bg-[#303030] text-[#050505] dark:text-[#e4e6eb] px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm max-w-xs">
                    Tạo tài khoản hoặc đăng nhập để bắt đầu trò chuyện ngay!
                    <span className="absolute -bottom-2.5 right-3 bg-white dark:bg-[#242526] px-1.5 py-0.5 rounded-full shadow border border-gray-100 dark:border-gray-700 text-xs">
                      ❤️ 👍
                    </span>
                  </div>
                </div>
              </div>

              {/* Mockup Input */}
              <div className="pt-3 flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-[#f0f2f5] dark:bg-[#3a3b3c] flex items-center justify-center text-[#0084FF] font-bold">
                  +
                </div>
                <div className="flex-1 bg-[#f0f2f5] dark:bg-[#3a3b3c] rounded-full px-4 py-2 text-xs text-[#65676b] dark:text-[#b0b3b8]">
                  Aa
                </div>
                <div className="text-lg">👍</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 md:px-12 py-6 border-t border-gray-100 dark:border-[#2f3031] flex flex-col sm:flex-row items-center justify-between text-xs text-[#65676b] dark:text-[#b0b3b8] gap-2">
        <p>© Meta {new Date().getFullYear()}. Biểu trưng Apple và Google Play là nhãn hiệu thuộc chủ sở hữu tương ứng.</p>
        <div className="flex items-center space-x-6">
          <span>Chính sách quyền riêng tư</span>
          <span>Chính sách cookie</span>
          <span>Điều khoản</span>
          <span>Tiếng Việt</span>
        </div>
      </footer>
    </div>
  );
}
