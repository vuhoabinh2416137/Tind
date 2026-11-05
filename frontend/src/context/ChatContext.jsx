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

// Base URLs configurable via environment variables (e.g. on Vercel) with production fallback
const API_URL = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
    ? 'https://tind-messenger-backend.onrender.com'
    : ''
);
const WS_URL = import.meta.env.VITE_WS_URL || (
  typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
    ? 'https://tind-messenger-backend.onrender.com/ws'
    : (window.location.protocol === 'https:' ? `https://${window.location.host}/ws` : 'http://localhost:8080/ws')
);

export const ChatProvider = ({ children }) => {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Users state
  const [allUsers, setAllUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('messenger_active_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Conversations & Messages
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({}); // userId -> boolean

  // UI States
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [lightboxMedia, setLightboxMedia] = useState(null);
  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState(false);
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

  // Load all users on mount
  useEffect(() => {
    fetch(`${API_URL}/api/users`)
      .then(res => res.json())
      .then(users => {
        setAllUsers(users);
      })
      .catch(err => console.error('Failed to load users:', err));
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
        .then(results => setSearchResults(results))
        .catch(err => console.error('Search error:', err));
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
      debug: () => {}, // Suppress noisy debug logs in production
      onConnect: () => {
        // 1. Subscribe to presence events
        client.subscribe('/topic/presence', (msg) => {
          try {
            const data = JSON.parse(msg.body);
            if (data.newUser) {
              setAllUsers(prev => {
                if (prev.some(u => u.id === data.newUser.id)) return prev;
                return [...prev, data.newUser];
              });
            }
            if (data.userId) {
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
        setConversations(convs);
        if (convs.length > 0 && !activeConversation) {
          selectConversation(convs[0]);
        }
      })
      .catch(err => console.error('Failed to load conversations:', err));
  }, [currentUser]);

  // Active Conversation STOMP Subscriptions
  useEffect(() => {
    const client = stompClientRef.current;
    if (!client || !client.connected || !activeConversation) return;

    // Unsubscribe from previous conversation topics
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

      // Update conversations list last message
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

    // Mark messages as seen
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

    // Clear unread badge locally
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c));

    // Fetch messages
    fetch(`${API_URL}/api/messages/${conv.id}`)
      .then(res => res.json())
      .then(msgs => {
        setMessages(msgs);
      })
      .catch(err => console.error('Failed to load messages:', err));
  };

  // Auth: Login
  const login = async (username) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Đăng nhập thất bại');
    setCurrentUser(data);
    localStorage.setItem('messenger_active_user', JSON.stringify(data));
    return data;
  };

  // Auth: Register
  const register = async ({ name, username, avatar }) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, avatar })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Đăng ký thất bại');
    setCurrentUser(data);
    localStorage.setItem('messenger_active_user', JSON.stringify(data));
    return data;
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

  // Switch Active User (Demo)
  const switchUser = (newUser) => {
    if (newUser.id === currentUser?.id) return;
    setCurrentUser(newUser);
    localStorage.setItem('messenger_active_user', JSON.stringify(newUser));
    setActiveConversation(null);
    setMessages([]);
    setIsUserSwitcherOpen(false);
  };

  // Start or open conversation with user
  const startConversationWithUser = (targetUserId) => {
    if (targetUserId === currentUser?.id) return;
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
            setConversations(convs);
            const found = convs.find(c => c.id === conv.id);
            if (found) selectConversation(found);
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
        switchUser,
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
        isUserSwitcherOpen,
        setIsUserSwitcherOpen,
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
