import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { soundEffects } from '../utils/sound';

const ChatContext = createContext(null);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

// Legacy demo user IDs to purge/ignore
const DEMO_USER_IDS = new Set(['u_ducanh', 'u_baolong', 'u_khanhvy', 'u_meta_ai']);
const DEMO_CONV_IDS = new Set([
  'c_u_baolong_u_ducanh',
  'c_u_ducanh_u_khanhvy',
  'c_u_ducanh_u_meta_ai'
]);

const GMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;

export const getDefaultAvatar = (name = 'User') => {
  const cleanName = (name || 'User').trim();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=0084FF&color=fff&bold=true&size=150`;
};

// Base URLs configurable via environment variables (e.g. on Vercel) with production fallback
const rawApiUrl = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
    ? 'https://tind-messenger-backend.onrender.com'
    : ''
);
const API_URL = rawApiUrl ? rawApiUrl.replace(/\/+$/, '') : '';

const rawWsUrl = import.meta.env.VITE_WS_URL || (
  typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
    ? 'https://tind-messenger-backend.onrender.com/ws'
    : (typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? `https://${window.location.host}/ws`
      : 'http://localhost:8080/ws')
);
const WS_URL = rawWsUrl ? rawWsUrl.replace(/\/+$/, '') : '';

export const ChatProvider = ({ children }) => {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Users state (excluding any legacy demo users)
  const [allUsers, setAllUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('messenger_active_user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (!parsed || DEMO_USER_IDS.has(parsed.id)) {
        localStorage.removeItem('messenger_active_user');
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  // Conversations & Messages
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({}); // userId -> boolean

  // UI States
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [lightboxMedia, setLightboxMedia] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // STOMP Client Reference
  const stompClientRef = useRef(null);
  const convSubscriptionsRef = useRef([]);
  const typingTimeoutRef = useRef(null);

  // Sync theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  // Load all non-demo users on mount
  useEffect(() => {
    fetch(`${API_URL}/api/users`)
      .then(res => res.json())
      .then(users => {
        if (Array.isArray(users)) {
          setAllUsers(users.filter(u => u && !DEMO_USER_IDS.has(u.id)));
        } else {
          setAllUsers([]);
        }
      })
      .catch(err => {
        console.error('Failed to load users:', err);
        setAllUsers([]);
      });
  }, []);

  // Search users on platform
  useEffect(() => {
    if (!searchQuery.trim() || !currentUser) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(searchQuery)}&userId=${currentUser.id}`)
        .then(res => res.json())
        .then(results => {
          if (Array.isArray(results)) {
            setSearchResults(results.filter(u => u && !DEMO_USER_IDS.has(u.id)));
          } else {
            setSearchResults([]);
          }
        })
        .catch(err => {
          console.error('Search error:', err);
          setSearchResults([]);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, currentUser]);

  // STOMP WebSocket Connection to Spring Boot
  useEffect(() => {
    if (!currentUser) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: () => {},
      onConnect: () => {
        client.subscribe('/topic/presence', (msg) => {
          try {
            const data = JSON.parse(msg.body);
            if (data.newUser && !DEMO_USER_IDS.has(data.newUser.id)) {
              setAllUsers(prev => {
                if (prev.some(u => u.id === data.newUser.id)) return prev;
                return [...prev, data.newUser];
              });
            }
            if (data.userId && !DEMO_USER_IDS.has(data.userId)) {
              setAllUsers(prev => prev.map(u => u.id === data.userId ? { ...u, online: data.online } : u));
              setConversations(prev => prev.map(c => {
                if (c.participants?.includes(data.userId) && c.participants?.find(p => p !== currentUser.id) === data.userId) {
                  return { ...c, online: data.online };
                }
                return c;
              }));
            }
          } catch (e) {
            console.error('Error handling presence payload:', e);
          }
        });

        client.subscribe(`/topic/user.${currentUser.id}`, (msg) => {
          try {
            const data = JSON.parse(msg.body);
            if (data.lastMessage) {
              setConversations(prev => prev.map(c => {
                if (c.id === data.conversationId) {
                  return {
                    ...c,
                    lastMessage: data.lastMessage,
                    unreadCount: (activeConversation?.id === c.id || data.lastMessage.senderId === currentUser.id)
                      ? 0
                      : (c.unreadCount || 0) + 1
                  };
                }
                return c;
              }).sort((a, b) => {
                const timeA = a.lastMessage?.createdAt || 0;
                const timeB = b.lastMessage?.createdAt || 0;
                return timeB - timeA;
              }));
            }
          } catch (e) {
            console.error('Error handling user notification:', e);
          }
        });

        fetch(`${API_URL}/api/users/${currentUser.id}/presence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ online: true })
        }).catch(() => {});
      }
    });

    client.activate();
    stompClientRef.current = client;

    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
    };
  }, [currentUser]);

  // Load conversations when currentUser changes
  useEffect(() => {
    if (!currentUser) return;
    fetch(`${API_URL}/api/conversations?userId=${currentUser.id}`)
      .then(res => res.json())
      .then(convs => {
        if (Array.isArray(convs)) {
          const validConvs = convs.filter(c =>
            c &&
            !DEMO_CONV_IDS.has(c.id) &&
            !(Array.isArray(c.participants) && c.participants.some(p => DEMO_USER_IDS.has(p)))
          );
          setConversations(validConvs);
          if (validConvs.length > 0 && !activeConversation) {
            selectConversation(validConvs[0]);
          }
        } else {
          setConversations([]);
        }
      })
      .catch(err => {
        console.error('Failed to load conversations:', err);
        setConversations([]);
      });
  }, [currentUser]);

  // Active Conversation STOMP Subscriptions
  useEffect(() => {
    const client = stompClientRef.current;
    if (!client || !client.connected || !activeConversation) return;

    convSubscriptionsRef.current.forEach(sub => sub.unsubscribe());
    convSubscriptionsRef.current = [];

    const convId = activeConversation.id;

    const subMessages = client.subscribe(`/topic/conversation.${convId}`, (msg) => {
      const newMsg = JSON.parse(msg.body);
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      if (newMsg.senderId !== currentUser?.id) {
        soundEffects.playReceive();
      } else {
        soundEffects.playSend();
      }

      setConversations(prev => prev.map(c => {
        if (c.id === newMsg.conversationId) {
          return {
            ...c,
            lastMessage: newMsg,
            unreadCount: (activeConversation?.id === c.id || newMsg.senderId === currentUser?.id)
              ? 0
              : (c.unreadCount || 0) + 1
          };
        }
        return c;
      }).sort((a, b) => {
        const timeA = a.lastMessage?.createdAt || 0;
        const timeB = b.lastMessage?.createdAt || 0;
        return timeB - timeA;
      }));
    });

    const subTyping = client.subscribe(`/topic/conversation.${convId}.typing`, (msg) => {
      const data = JSON.parse(msg.body);
      setTypingUsers(prev => ({
        ...prev,
        [data.userId]: data.typing
      }));
    });

    const subReaction = client.subscribe(`/topic/conversation.${convId}.reaction`, (msg) => {
      const data = JSON.parse(msg.body);
      setMessages(prev => prev.map(m => {
        if (m.id === data.messageId) {
          return { ...m, reactions: data.reactions };
        }
        return m;
      }));
      soundEffects.playReaction();
    });

    const subUnsend = client.subscribe(`/topic/conversation.${convId}.unsend`, (msg) => {
      const data = JSON.parse(msg.body);
      setMessages(prev => prev.map(m => {
        if (m.id === data.messageId) {
          return { ...m, isUnsent: true, text: data.text, fileUrl: null, replyTo: null, reactions: {} };
        }
        return m;
      }));
    });

    const subSeen = client.subscribe(`/topic/conversation.${convId}.seen`, (msg) => {
      const data = JSON.parse(msg.body);
      setMessages(prev => prev.map(m => {
        if (m.senderId === currentUser?.id) {
          const seenBy = m.seenBy || [];
          if (!seenBy.includes(data.userId)) {
            return { ...m, seenBy: [...seenBy, data.userId] };
          }
        }
        return m;
      }));
    });

    const subTheme = client.subscribe(`/topic/conversation.${convId}.theme`, (msg) => {
      const data = JSON.parse(msg.body);
      setActiveConversation(prev => prev?.id === data.conversationId ? { ...prev, theme: data.theme, quickEmoji: data.quickEmoji } : prev);
      setConversations(prev => prev.map(c => c.id === data.conversationId ? { ...c, theme: data.theme, quickEmoji: data.quickEmoji } : c));
    });

    convSubscriptionsRef.current = [subMessages, subTyping, subReaction, subUnsend, subSeen, subTheme];

    client.publish({
      destination: '/app/chat.seen',
      body: JSON.stringify({
        conversationId: convId,
        userId: currentUser?.id
      })
    });

    return () => {
      convSubscriptionsRef.current.forEach(sub => sub.unsubscribe());
      convSubscriptionsRef.current = [];
    };
  }, [activeConversation?.id, currentUser?.id]);

  // Select a conversation
  const selectConversation = (conv) => {
    setActiveConversation(conv);
    setReplyingTo(null);
    setTypingUsers({});

    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c));

    fetch(`${API_URL}/api/messages/${conv.id}`)
      .then(res => res.json())
      .then(msgs => {
        if (Array.isArray(msgs)) {
          setMessages(msgs);
        } else {
          setMessages([]);
        }
      })
      .catch(err => {
        console.error('Failed to load messages:', err);
        setMessages([]);
      });
  };

  // Helper: Local OTP & Email Registry for seamless Gmail verification
  const getLocalEmailMap = () => {
    try {
      return JSON.parse(localStorage.getItem('messenger_email_map') || '{}');
    } catch {
      return {};
    }
  };

  const saveLocalEmailMap = (map) => {
    try {
      localStorage.setItem('messenger_email_map', JSON.stringify(map));
    } catch {}
  };

  const getLocalOtpMap = () => {
    try {
      return JSON.parse(localStorage.getItem('messenger_otp_map') || '{}');
    } catch {
      return {};
    }
  };

  const saveLocalOtpMap = (map) => {
    try {
      localStorage.setItem('messenger_otp_map', JSON.stringify(map));
    } catch {}
  };

  // Send 6-digit OTP to real Gmail inbox via Vercel Serverless SMTP (/api/send-gmail) or Spring Boot SMTP
  const sendGmailOtp = async (email, purpose = 'REGISTER') => {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!GMAIL_REGEX.test(cleanEmail)) {
      throw new Error('Vui lòng nhập địa chỉ Gmail hợp lệ (ví dụ: tenban@gmail.com)');
    }

    // Check against existing users list
    const existingUserWithEmail = (Array.isArray(allUsers) ? allUsers : []).find(
      u => (u.email && u.email.toLowerCase() === cleanEmail) || (u.username && `${u.username.toLowerCase()}@gmail.com` === cleanEmail)
    );
    const emailMap = getLocalEmailMap();

    if (purpose === 'REGISTER' && (emailMap[cleanEmail] || (existingUserWithEmail && existingUserWithEmail.email))) {
      throw new Error('Địa chỉ Gmail này đã được đăng ký cho một tài khoản khác');
    }

    if (purpose === 'RESET_PASSWORD' && !emailMap[cleanEmail] && !existingUserWithEmail) {
      // Also check backend if account exists
      try {
        const checkRes = await fetch(`${API_URL}/api/users/search?q=${encodeURIComponent(cleanEmail.split('@')[0])}&userId=none`);
        const foundUsers = await checkRes.json().catch(() => []);
        const matched = Array.isArray(foundUsers) && foundUsers.some(
          u => (u.email && u.email.toLowerCase() === cleanEmail) || u.username === cleanEmail.split('@')[0]
        );
        if (!matched) {
          throw new Error('Không tìm thấy tài khoản nào liên kết với địa chỉ Gmail này');
        }
      } catch (e) {
        if (e.message && e.message.includes('Không tìm thấy')) throw e;
      }
    }

    // Generate 6-digit OTP & store with 10-minute expiration
    let otpCode = String(Math.floor(100000 + Math.random() * 900000));

    // 1. Try backend /api/auth/send-otp (if Spring Boot has SMTP configured, it will send directly; otherwise returns generated OTP)
    try {
      const backendRes = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, purpose })
      });
      if (backendRes.ok) {
        const backendData = await backendRes.json();
        if (backendData.fallbackOtp) {
          otpCode = String(backendData.fallbackOtp);
        }
        if (backendData.deliveredViaSmtp) {
          const otpMap = getLocalOtpMap();
          otpMap[`${cleanEmail}:${purpose}`] = {
            otp: otpCode,
            expiresAt: Date.now() + 10 * 60 * 1000
          };
          saveLocalOtpMap(otpMap);
          return {
            email: cleanEmail,
            deliveredViaSmtp: true,
            message: `Mã xác nhận 6 số đã được gửi tới hộp thư Gmail ${cleanEmail}`
          };
        }
      } else if (backendRes.status === 400) {
        const errData = await backendRes.json().catch(() => ({}));
        if (errData.error) throw new Error(errData.error);
      }
    } catch (err) {
      if (err.message && (err.message.includes('Gmail') || err.message.includes('tài khoản'))) {
        throw err;
      }
    }

    // 2. Send real email via Vercel Serverless Function (/api/send-gmail using Nodemailer + smtp.gmail.com:465)
    const vercelRes = await fetch('/api/send-gmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        otp: otpCode,
        purpose
      })
    });

    const vercelData = await vercelRes.json().catch(() => ({}));
    if (!vercelRes.ok) {
      throw new Error(
        vercelData.error ||
        'Không thể gửi email tới hộp thư Gmail. Vui lòng kiểm tra cấu hình GMAIL_USER và GMAIL_APP_PASSWORD trên Vercel.'
      );
    }

    const otpMap = getLocalOtpMap();
    otpMap[`${cleanEmail}:${purpose}`] = {
      otp: otpCode,
      expiresAt: Date.now() + 10 * 60 * 1000
    };
    saveLocalOtpMap(otpMap);

    return {
      email: cleanEmail,
      deliveredViaSmtp: true,
      message: `Mã xác nhận 6 số đã được gửi tới hộp thư Gmail ${cleanEmail}`
    };
  };

  // Verify 6-digit Gmail OTP
  const verifyGmailOtp = async (email, otp, purpose = 'REGISTER') => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanOtp = (otp || '').trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      throw new Error('Vui lòng nhập mã xác nhận gồm 6 chữ số từ Gmail');
    }

    // Check local OTP store first
    const otpMap = getLocalOtpMap();
    const record = otpMap[`${cleanEmail}:${purpose}`];
    if (record && record.expiresAt > Date.now() && record.otp === cleanOtp) {
      return true;
    }

    // Check backend /api/auth/verify-otp
    const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, otp: cleanOtp, purpose })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Mã xác nhận Gmail không chính xác hoặc đã hết hạn');
    }
    return true;
  };

  // Reset Password with Gmail OTP
  const resetPasswordWithGmail = async ({ email, otp, newPassword }) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanOtp = (otp || '').trim();

    if (!GMAIL_REGEX.test(cleanEmail)) {
      throw new Error('Vui lòng nhập địa chỉ Gmail hợp lệ');
    }
    if (!/^\d{6}$/.test(cleanOtp)) {
      throw new Error('Mã xác nhận Gmail phải gồm 6 chữ số');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự');
    }

    await verifyGmailOtp(cleanEmail, cleanOtp, 'RESET_PASSWORD');

    // Call backend reset-password
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, otp: cleanOtp, newPassword })
      });
      if (!res.ok && res.status === 400) {
        const errData = await res.json().catch(() => ({}));
        if (errData.error && !errData.error.includes('Không tìm thấy')) {
          throw new Error(errData.error);
        }
      }
    } catch (e) {
      // Continue updating local credential store as well
    }

    // Update local credential map so login with new password works immediately
    const emailMap = getLocalEmailMap();
    const linkedUsername = emailMap[cleanEmail];
    const localCredsRaw = localStorage.getItem('messenger_credentials_map');
    const localCreds = localCredsRaw ? JSON.parse(localCredsRaw) : {};
    if (linkedUsername) {
      localCreds[linkedUsername] = newPassword;
    }
    localCreds[cleanEmail] = newPassword;
    localStorage.setItem('messenger_credentials_map', JSON.stringify(localCreds));

    // Consume OTP
    const otpMap = getLocalOtpMap();
    delete otpMap[`${cleanEmail}:RESET_PASSWORD`];
    saveLocalOtpMap(otpMap);

    return true;
  };

  // Auth: Login with username OR Gmail + password
  const login = async (identifierInput, password) => {
    let cleanIdentifier = (identifierInput || '').trim().toLowerCase();
    if (!cleanIdentifier) {
      throw new Error('Vui lòng nhập địa chỉ Gmail hoặc tên người dùng');
    }
    if (!password) {
      throw new Error('Vui lòng nhập mật khẩu');
    }

    // Resolve email -> username if stored locally
    const emailMap = getLocalEmailMap();
    const resolvedUsername = emailMap[cleanIdentifier] || cleanIdentifier;

    if (['ducanh', 'baolong', 'khanhvy', 'meta_ai'].includes(resolvedUsername)) {
      throw new Error('Tài khoản hoặc mật khẩu không chính xác');
    }

    const localCredsRaw = localStorage.getItem('messenger_credentials_map');
    const localCreds = localCredsRaw ? JSON.parse(localCredsRaw) : {};
    const expectedPass = localCreds[resolvedUsername] || localCreds[cleanIdentifier];
    if (expectedPass && expectedPass !== password) {
      throw new Error('Tài khoản hoặc mật khẩu không chính xác');
    }

    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: resolvedUsername, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Tài khoản hoặc mật khẩu không chính xác');
    if (DEMO_USER_IDS.has(data.id)) {
      throw new Error('Tài khoản không tồn tại');
    }

    const userWithAvatar = {
      ...data,
      avatar: getDefaultAvatar(data.name)
    };

    setCurrentUser(userWithAvatar);
    localStorage.setItem('messenger_active_user', JSON.stringify(userWithAvatar));
    return userWithAvatar;
  };

  // Auth: Register new account with Gmail OTP verification
  const register = async ({ name, username, email, password, otp }) => {
    const cleanName = (name || '').trim();
    const cleanUsername = (username || '').trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanName) {
      throw new Error('Vui lòng nhập họ và tên của bạn');
    }
    if (cleanUsername.length < 3) {
      throw new Error('Tên đăng nhập phải có ít nhất 3 ký tự');
    }
    if (!GMAIL_REGEX.test(cleanEmail)) {
      throw new Error('Vui lòng nhập địa chỉ Gmail hợp lệ (@gmail.com)');
    }
    if (!password || password.length < 6) {
      throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
    }
    if (['ducanh', 'baolong', 'khanhvy', 'meta_ai'].includes(cleanUsername)) {
      throw new Error('Tên đăng nhập này không khả dụng');
    }

    // Verify OTP if provided
    if (otp) {
      await verifyGmailOtp(cleanEmail, otp, 'REGISTER');
    }

    const defaultAvatar = getDefaultAvatar(cleanName);

    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        password,
        otp,
        avatar: defaultAvatar
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Đăng ký tài khoản thất bại');

    try {
      const localCredsRaw = localStorage.getItem('messenger_credentials_map');
      const localCreds = localCredsRaw ? JSON.parse(localCredsRaw) : {};
      localCreds[cleanUsername] = password;
      localCreds[cleanEmail] = password;
      localStorage.setItem('messenger_credentials_map', JSON.stringify(localCreds));

      const emailMap = getLocalEmailMap();
      emailMap[cleanEmail] = cleanUsername;
      saveLocalEmailMap(emailMap);

      const otpMap = getLocalOtpMap();
      delete otpMap[`${cleanEmail}:REGISTER`];
      saveLocalOtpMap(otpMap);
    } catch {}

    const userWithAvatar = {
      ...data,
      email: cleanEmail,
      emailVerified: true,
      avatar: defaultAvatar
    };

    setCurrentUser(userWithAvatar);
    localStorage.setItem('messenger_active_user', JSON.stringify(userWithAvatar));
    setAllUsers(prev => prev.some(u => u.id === userWithAvatar.id) ? prev : [...prev, userWithAvatar]);
    return userWithAvatar;
  };

  // Auth: Logout
  const logout = () => {
    if (currentUser) {
      fetch(`${API_URL}/api/users/${currentUser.id}/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ online: false })
      }).catch(() => {});
    }
    if (stompClientRef.current) stompClientRef.current.deactivate();
    setCurrentUser(null);
    localStorage.removeItem('messenger_active_user');
    setActiveConversation(null);
    setConversations([]);
    setMessages([]);
  };

  // Start or open conversation with user
  const startConversationWithUser = (targetUserId) => {
    if (!targetUserId || targetUserId === currentUser?.id || DEMO_USER_IDS.has(targetUserId)) return;
    fetch(`${API_URL}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userA: currentUser?.id, userB: targetUserId })
    })
      .then(res => res.json())
      .then(conv => {
        fetch(`${API_URL}/api/conversations?userId=${currentUser?.id}`)
          .then(res => res.json())
          .then(convs => {
            if (Array.isArray(convs)) {
              const validConvs = convs.filter(c =>
                c &&
                !DEMO_CONV_IDS.has(c.id) &&
                !(Array.isArray(c.participants) && c.participants.some(p => DEMO_USER_IDS.has(p)))
              );
              setConversations(validConvs);
              const found = validConvs.find(c => c.id === conv.id);
              if (found) selectConversation(found);
            }
          });
      })
      .catch(err => console.error('Failed to start conversation:', err));
  };

  // Send Message
  const sendMessage = ({ text = '', type = 'text', fileUrl = null }) => {
    if (!activeConversation || !currentUser) return;
    if (!text.trim() && !fileUrl && type !== 'like') return;

    const messageData = {
      conversationId: activeConversation.id,
      senderId: currentUser.id,
      text: text.trim(),
      type,
      fileUrl,
      replyTo: replyingTo ? {
        id: replyingTo.id,
        senderId: replyingTo.senderId,
        senderName: replyingTo.senderId === currentUser.id ? 'Bạn' : (activeConversation.name || 'Người dùng'),
        text: replyingTo.type === 'image' ? '[Hình ảnh]' : replyingTo.text
      } : null,
      createdAt: Date.now()
    };

    if (stompClientRef.current && stompClientRef.current.connected) {
      stompClientRef.current.publish({
        destination: '/app/chat.sendMessage',
        body: JSON.stringify(messageData)
      });
    }

    setReplyingTo(null);
    sendTyping(false);
  };

  const sendQuickLike = () => {
    const emoji = activeConversation?.quickEmoji || '👍';
    sendMessage({ text: emoji, type: 'like' });
  };

  const sendTyping = (isTyping) => {
    if (!activeConversation || !currentUser || !stompClientRef.current?.connected) return;

    stompClientRef.current.publish({
      destination: '/app/chat.typing',
      body: JSON.stringify({
        conversationId: activeConversation.id,
        userId: currentUser.id,
        typing: isTyping
      })
    });

    if (isTyping) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        stompClientRef.current?.publish({
          destination: '/app/chat.typing',
          body: JSON.stringify({
            conversationId: activeConversation.id,
            userId: currentUser.id,
            typing: false
          })
        });
      }, 2500);
    }
  };

  const toggleReaction = (messageId, reaction) => {
    if (!activeConversation || !currentUser || !stompClientRef.current?.connected) return;
    stompClientRef.current.publish({
      destination: '/app/chat.react',
      body: JSON.stringify({
        messageId,
        conversationId: activeConversation.id,
        userId: currentUser.id,
        reaction
      })
    });
  };

  const unsendMessage = (messageId) => {
    if (!activeConversation || !currentUser || !stompClientRef.current?.connected) return;
    stompClientRef.current.publish({
      destination: '/app/chat.unsend',
      body: JSON.stringify({
        messageId,
        conversationId: activeConversation.id,
        userId: currentUser.id
      })
    });
  };

  const updateTheme = (themeColor, quickEmoji) => {
    if (!activeConversation) return;
    fetch(`${API_URL}/api/conversations/${activeConversation.id}/theme`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: themeColor, quickEmoji })
    })
      .then(res => res.json())
      .catch(err => console.error('Failed to update theme:', err));
  };

  return (
    <ChatContext.Provider
      value={{
        isDarkMode,
        toggleTheme,
        allUsers,
        currentUser,
        login,
        register,
        sendGmailOtp,
        verifyGmailOtp,
        resetPasswordWithGmail,
        logout,
        conversations,
        activeConversation,
        selectConversation,
        startConversationWithUser,
        messages,
        typingUsers,
        sendMessage,
        sendQuickLike,
        sendTyping,
        toggleReaction,
        unsendMessage,
        updateTheme,
        replyingTo,
        setReplyingTo,
        isRightSidebarOpen,
        setIsRightSidebarOpen,
        lightboxMedia,
        setLightboxMedia,
        searchQuery,
        setSearchQuery,
        searchResults,
        API_URL
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
