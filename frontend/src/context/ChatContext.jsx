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
        // 1. Subscribe to presence events
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

        // 2. Subscribe to user private channel
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

        // Notify server that user is online
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

    // 1. Subscribe to new messages
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

    // 2. Subscribe to typing indicator
    const subTyping = client.subscribe(`/topic/conversation.${convId}.typing`, (msg) => {
      const data = JSON.parse(msg.body);
      setTypingUsers(prev => ({
        ...prev,
        [data.userId]: data.typing
      }));
    });

    // 3. Subscribe to reaction update
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

    // 4. Subscribe to message unsend
    const subUnsend = client.subscribe(`/topic/conversation.${convId}.unsend`, (msg) => {
      const data = JSON.parse(msg.body);
      setMessages(prev => prev.map(m => {
        if (m.id === data.messageId) {
          return { ...m, isUnsent: true, text: data.text, fileUrl: null, replyTo: null, reactions: {} };
        }
        return m;
      }));
    });

    // 5. Subscribe to seen receipts
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

    // 6. Subscribe to theme updates
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

  // Auth: Login with username & password
  const login = async (username, password) => {
    const cleanUsername = (username || '').trim().toLowerCase();
    if (!cleanUsername) {
      throw new Error('Vui lòng nhập tên người dùng hoặc email');
    }
    if (!password) {
      throw new Error('Vui lòng nhập mật khẩu');
    }

    // Reject legacy demo usernames immediately
    if (['ducanh', 'baolong', 'khanhvy', 'meta_ai'].includes(cleanUsername)) {
      throw new Error('Tài khoản hoặc mật khẩu không chính xác');
    }

    // Check client-side password registry if stored
    const localCredsRaw = localStorage.getItem('messenger_credentials_map');
    const localCreds = localCredsRaw ? JSON.parse(localCredsRaw) : {};
    if (localCreds[cleanUsername] && localCreds[cleanUsername] !== password) {
      throw new Error('Tài khoản hoặc mật khẩu không chính xác');
    }

    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanUsername, password })
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

  // Auth: Register new account (no avatar picker, automatic default avatar)
  const register = async ({ name, username, password }) => {
    const cleanName = (name || '').trim();
    const cleanUsername = (username || '').trim().toLowerCase().replace(/[^a-z0-9_.]/g, '');

    if (!cleanName) {
      throw new Error('Vui lòng nhập họ và tên của bạn');
    }
    if (cleanUsername.length < 3) {
      throw new Error('Tên đăng nhập phải có ít nhất 3 ký tự');
    }
    if (!password || password.length < 6) {
      throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
    }
    if (['ducanh', 'baolong', 'khanhvy', 'meta_ai'].includes(cleanUsername)) {
      throw new Error('Tên đăng nhập này không khả dụng');
    }

    const defaultAvatar = getDefaultAvatar(cleanName);

    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: cleanName,
        username: cleanUsername,
        password,
        avatar: defaultAvatar
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Đăng ký tài khoản thất bại');

    // Save credential locally as well for immediate verification
    try {
      const localCredsRaw = localStorage.getItem('messenger_credentials_map');
      const localCreds = localCredsRaw ? JSON.parse(localCredsRaw) : {};
      localCreds[cleanUsername] = password;
      localStorage.setItem('messenger_credentials_map', JSON.stringify(localCreds));
    } catch {}

    const userWithAvatar = {
      ...data,
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

  // Send Quick Like
  const sendQuickLike = () => {
    const emoji = activeConversation?.quickEmoji || '👍';
    sendMessage({ text: emoji, type: 'like' });
  };

  // Typing status
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

  // Toggle Reaction
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

  // Unsend Message
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

  // Update Conversation Theme
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
