import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, Mail, ShieldCheck, ArrowLeft } from 'lucide-react';
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

const GMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;

export default function AuthModal() {
  const {
    currentUser,
    login,
    register,
    sendGmailOtp,
    resetPasswordWithGmail
  } = useChat();

  // Modes: 'login' | 'register' | 'verify-register' | 'forgot' | 'reset-password'
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [gmailToast, setGmailToast] = useState(null);

  if (currentUser) return null;

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setSuccessMsg('');
    setOtp('');
  };

  const triggerGmailToast = (targetEmail, code, purpose) => {
    if (!code) return;
    setGmailToast({
      email: targetEmail,
      code,
      subject: purpose === 'RESET_PASSWORD'
        ? `${code} là mã khôi phục mật khẩu Messenger của bạn`
        : `${code} là mã xác nhận tài khoản Messenger của bạn`
    });
  };

  // Step 1 Register -> Send OTP to Gmail
  const handleRequestRegisterOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!name.trim()) {
      setError('Vui lòng nhập họ và tên hiển thị');
      return;
    }
    if (!username.trim() || username.trim().length < 3) {
      setError('Tên đăng nhập phải có ít nhất 3 ký tự');
      return;
    }
    if (!GMAIL_REGEX.test(email.trim())) {
      setError('Vui lòng nhập địa chỉ Gmail hợp lệ (ví dụ: tenban@gmail.com)');
      return;
    }
    if (!password || password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendGmailOtp(email.trim(), 'REGISTER');
      if (res.fallbackOtp) {
        triggerGmailToast(email.trim().toLowerCase(), res.fallbackOtp, 'REGISTER');
      }
      setMode('verify-register');
      setSuccessMsg(`Đã gửi mã xác nhận gồm 6 chữ số tới Gmail ${email.trim().toLowerCase()}`);
    } catch (err) {
      setError(err.message || 'Không thể gửi mã xác nhận Gmail');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 Register -> Verify OTP & Create Account
  const handleCompleteRegister = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!/^\d{6}$/.test(otp.trim())) {
        throw new Error('Vui lòng nhập đúng 6 chữ số mã xác nhận từ Gmail');
      }
      await register({
        name: name.trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password,
        otp: otp.trim()
      });
      setGmailToast(null);
    } catch (err) {
      setError(err.message || 'Xác nhận Gmail thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1 Forgot Password -> Send OTP to Gmail
  const handleRequestResetOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!GMAIL_REGEX.test(email.trim())) {
      setError('Vui lòng nhập địa chỉ Gmail đã liên kết với tài khoản (@gmail.com)');
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendGmailOtp(email.trim(), 'RESET_PASSWORD');
      if (res.fallbackOtp) {
        triggerGmailToast(email.trim().toLowerCase(), res.fallbackOtp, 'RESET_PASSWORD');
      }
      setMode('reset-password');
      setSuccessMsg(`Mã khôi phục mật khẩu 6 số đã được gửi tới ${email.trim().toLowerCase()}`);
    } catch (err) {
      setError(err.message || 'Không tìm thấy tài khoản với Gmail này');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 Forgot Password -> Verify OTP & Set New Password
  const handleCompleteResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Vui lòng nhập mã xác nhận 6 chữ số từ Gmail');
      return;
    }
    if (!password || password.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsLoading(true);
    try {
      await resetPasswordWithGmail({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword: password
      });
      setGmailToast(null);
      setUsername(email.trim().toLowerCase());
      setPassword('');
      setConfirmPassword('');
      setOtp('');
      setMode('login');
      setSuccessMsg('Đặt lại mật khẩu qua Gmail thành công! Vui lòng đăng nhập bằng mật khẩu mới.');
    } catch (err) {
      setError(err.message || 'Đặt lại mật khẩu thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  // Login Submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (!username.trim()) {
        throw new Error('Vui lòng nhập địa chỉ Gmail hoặc tên đăng nhập');
      }
      if (!password) {
        throw new Error('Vui lòng nhập mật khẩu');
      }
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const getHeadingText = () => {
    switch (mode) {
      case 'register':
        return 'Tạo tài khoản Messenger';
      case 'verify-register':
        return 'Xác nhận qua Gmail';
      case 'forgot':
        return 'Khôi phục mật khẩu';
      case 'reset-password':
        return 'Đặt lại mật khẩu mới';
      default:
        return 'Tụ họp mọi lúc, mọi nơi';
    }
  };

  const getSubtitleText = () => {
    switch (mode) {
      case 'register':
        return 'Liên kết với tài khoản Gmail của bạn để bảo mật và khôi phục mật khẩu dễ dàng.';
      case 'verify-register':
        return `Nhập mã bảo mật gồm 6 chữ số đã được gửi tới hộp thư Gmail ${email.trim().toLowerCase()}.`;
      case 'forgot':
        return 'Nhập địa chỉ Gmail đã đăng ký tài khoản để nhận mã xác nhận khôi phục mật khẩu.';
      case 'reset-password':
        return `Nhập mã 6 chữ số từ Gmail ${email.trim().toLowerCase()} và thiết lập mật khẩu mới cho tài khoản.`;
      default:
        return 'Với Messenger, việc kết nối với những người bạn yêu quý thật đơn giản và thú vị.';
    }
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-[#18191a] z-50 flex flex-col overflow-y-auto select-none">
      {/* Incoming Gmail OTP Notification Toast */}
      {gmailToast && (
        <div className="fixed top-5 right-5 z-50 w-full max-w-sm bg-white dark:bg-[#242526] rounded-2xl shadow-2xl border border-blue-200 dark:border-blue-900/60 p-4 animate-pop-in">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-full bg-red-50 dark:bg-red-950/50 flex items-center justify-center text-[#EA4335] flex-shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#050505] dark:text-white">
                  Gmail · Hộp thư đến ({gmailToast.email})
                </p>
                <p className="text-[11px] text-[#65676b] dark:text-[#b0b3b8]">
                  Từ: Messenger Security &lt;no-reply@messenger.com&gt;
                </p>
              </div>
            </div>
            <button
              onClick={() => setGmailToast(null)}
              className="text-xs text-[#65676b] hover:text-[#050505] dark:hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 p-3 bg-[#f0f2f5] dark:bg-[#303030] rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[11px] text-[#65676b] dark:text-[#b0b3b8]">Mã xác nhận Gmail của bạn:</p>
              <p className="text-xl font-extrabold tracking-[0.25em] text-[#0084FF] mt-0.5">
                {gmailToast.code}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOtp(gmailToast.code)}
              className="px-3 py-1.5 bg-[#0084FF] hover:bg-[#0073e6] text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Điền mã
            </button>
          </div>
        </div>
      )}

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
            className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] mb-4 bg-clip-text text-transparent"
            style={{
              backgroundImage: 'linear-gradient(83.84deg, #0088FF -6.87%, #A033FF 26.54%, #FF5C87 58.58%)'
            }}
          >
            {getHeadingText()}
          </h1>

          <p className="text-[15px] text-[#595959] dark:text-[#b0b3b8] mb-6 leading-relaxed">
            {getSubtitleText()}
          </p>

          {/* Alerts */}
          {error && (
            <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl flex items-center space-x-2.5 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center space-x-2.5 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.@]/g, ''))}
                  placeholder="Địa chỉ Gmail hoặc tên người dùng"
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
                  autoComplete="current-password"
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

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-8 py-3.5 bg-[#0084FF] hover:bg-[#0073e6] active:scale-[0.98] text-white font-semibold text-[15px] rounded-full transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Đăng nhập</span>
                </button>

                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-sm font-semibold text-[#0084FF] hover:underline"
                >
                  Quên mật khẩu?
                </button>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-gray-100 dark:border-[#2f3031]">
                <div className="flex items-center space-x-2.5">
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

                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-sm font-semibold text-[#0084FF] hover:underline"
                >
                  Tạo tài khoản mới
                </button>
              </div>
            </form>
          )}

          {/* 2. REGISTER FORM (STEP 1: ENTER INFO + GMAIL) */}
          {mode === 'register' && (
            <form onSubmit={handleRequestRegisterOtp} className="space-y-3">
              <div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Họ và tên hiển thị"
                  autoComplete="name"
                  className="w-full px-4 py-3 bg-[#f5f6f7] dark:bg-[#242526] border border-transparent focus:border-[#0084FF] rounded-xl text-[15px] text-[#050505] dark:text-white placeholder-[#65676b] dark:placeholder-[#b0b3b8] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                  placeholder="Tên người dùng (ví dụ: minhanh)"
                  autoComplete="username"
                  className="w-full px-4 py-3 bg-[#f5f6f7] dark:bg-[#242526] border border-transparent focus:border-[#0084FF] rounded-xl text-[15px] text-[#050505] dark:text-white placeholder-[#65676b] dark:placeholder-[#b0b3b8] focus:outline-none transition-colors"
                />
              </div>

              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                  placeholder="Địa chỉ Gmail xác thực (ví dụ: tenban@gmail.com)"
                  autoComplete="email"
                  className="w-full px-4 py-3 bg-[#f5f6f7] dark:bg-[#242526] border border-transparent focus:border-[#0084FF] rounded-xl text-[15px] text-[#050505] dark:text-white placeholder-[#65676b] dark:placeholder-[#b0b3b8] focus:outline-none transition-colors"
                />
              </div>

              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mật khẩu (tối thiểu 6 ký tự)"
                  autoComplete="new-password"
                  className="w-full pl-4 pr-11 py-3 bg-[#f5f6f7] dark:bg-[#242526] border border-transparent focus:border-[#0084FF] rounded-xl text-[15px] text-[#050505] dark:text-white placeholder-[#65676b] dark:placeholder-[#b0b3b8] focus:outline-none transition-colors"
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

              <div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 bg-[#f5f6f7] dark:bg-[#242526] border border-transparent focus:border-[#0084FF] rounded-xl text-[15px] text-[#050505] dark:text-white placeholder-[#65676b] dark:placeholder-[#b0b3b8] focus:outline-none transition-colors"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-7 py-3.5 bg-[#0084FF] hover:bg-[#0073e6] active:scale-[0.98] text-white font-semibold text-[15px] rounded-full transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  <span>Gửi mã xác nhận Gmail</span>
                </button>

                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-sm font-semibold text-[#0084FF] hover:underline"
                >
                  Đã có tài khoản? Đăng nhập
                </button>
              </div>
            </form>
          )}

          {/* 3. VERIFY GMAIL OTP FOR REGISTRATION */}
          {mode === 'verify-register' && (
            <form onSubmit={handleCompleteRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#65676b] dark:text-[#b0b3b8] uppercase tracking-wider mb-2">
                  Mã xác nhận Gmail (6 chữ số)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full px-4 py-3.5 bg-[#f5f6f7] dark:bg-[#242526] border border-transparent focus:border-[#0084FF] rounded-xl text-2xl font-bold tracking-[0.4em] text-center text-[#050505] dark:text-white focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-7 py-3.5 bg-[#0084FF] hover:bg-[#0073e6] text-white font-semibold text-[15px] rounded-full transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Xác nhận & Hoàn tất đăng ký</span>
                </button>

                <button
                  type="button"
                  onClick={handleRequestRegisterOtp}
                  disabled={isLoading}
                  className="text-sm font-semibold text-[#0084FF] hover:underline"
                >
                  Gửi lại mã
                </button>
              </div>

              <button
                type="button"
                onClick={() => setMode('register')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#65676b] hover:text-[#050505] dark:text-[#b0b3b8] dark:hover:text-white"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại chỉnh sửa thông tin</span>
              </button>
            </form>
          )}

          {/* 4. FORGOT PASSWORD VIA GMAIL (STEP 1: REQUEST OTP) */}
          {mode === 'forgot' && (
            <form onSubmit={handleRequestResetOtp} className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                  placeholder="Nhập địa chỉ Gmail của bạn (ví dụ: tenban@gmail.com)"
                  autoComplete="email"
                  className="w-full px-4 py-3.5 bg-[#f5f6f7] dark:bg-[#242526] border border-transparent focus:border-[#0084FF] rounded-xl text-[15px] text-[#050505] dark:text-white placeholder-[#65676b] dark:placeholder-[#b0b3b8] focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-7 py-3.5 bg-[#0084FF] hover:bg-[#0073e6] text-white font-semibold text-[15px] rounded-full transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  <span>Gửi mã khôi phục qua Gmail</span>
                </button>

                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-sm font-semibold text-[#0084FF] hover:underline"
                >
                  Quay lại đăng nhập
                </button>
              </div>
            </form>
          )}

          {/* 5. RESET PASSWORD VIA GMAIL OTP (STEP 2) */}
          {mode === 'reset-password' && (
            <form onSubmit={handleCompleteResetPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#65676b] dark:text-[#b0b3b8] uppercase tracking-wider mb-1.5">
                  Mã xác nhận Gmail (6 chữ số)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full px-4 py-3 bg-[#f5f6f7] dark:bg-[#242526] border border-transparent focus:border-[#0084FF] rounded-xl text-xl font-bold tracking-[0.35em] text-center text-[#050505] dark:text-white focus:outline-none transition-colors"
                />
              </div>

              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                  autoComplete="new-password"
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

              <div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  autoComplete="new-password"
                  className="w-full px-4 py-3.5 bg-[#f5f6f7] dark:bg-[#242526] border border-transparent focus:border-[#0084FF] rounded-xl text-[15px] text-[#050505] dark:text-white placeholder-[#65676b] dark:placeholder-[#b0b3b8] focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-7 py-3.5 bg-[#0084FF] hover:bg-[#0073e6] text-white font-semibold text-[15px] rounded-full transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Đặt lại mật khẩu</span>
                </button>

                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-sm font-semibold text-[#0084FF] hover:underline"
                >
                  Hủy
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Column: Authentic Messenger Preview Showcase */}
        <div className="hidden lg:flex lg:col-span-6 items-center justify-center">
          <div className="relative w-full max-w-lg">
            <div
              className="absolute -inset-4 rounded-[36px] blur-2xl opacity-30 pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, #0084FF 0%, #A033FF 50%, #FF5280 100%)'
              }}
            />

            <div className="relative bg-white dark:bg-[#242526] rounded-[28px] shadow-2xl border border-gray-100 dark:border-[#393a3b] p-6 space-y-5">
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
                    Bảo mật tài khoản với xác thực OTP 2 lớp qua Gmail ✨
                  </div>
                </div>

                <div className="flex items-end space-x-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#0084FF] to-[#A033FF] flex-shrink-0" />
                  <div className="relative bg-[#f0f2f5] dark:bg-[#303030] text-[#050505] dark:text-[#e4e6eb] px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm max-w-xs">
                    Đăng nhập hoặc khôi phục mật khẩu nhanh chóng qua Gmail của bạn!
                    <span className="absolute -bottom-2.5 right-3 bg-white dark:bg-[#242526] px-1.5 py-0.5 rounded-full shadow border border-gray-100 dark:border-gray-700 text-xs">
                      ❤️ 👍
                    </span>
                  </div>
                </div>
              </div>

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
