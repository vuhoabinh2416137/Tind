import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { soundEffects } from '../utils/sound';

const ChatContext = createContext(null);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

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

  // Socket reference
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Sync theme to document element
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

  // Fetch all users on mount
  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(users => {
        setAllUsers(users);
      })
      .catch(err => console.error('Failed to load users:', err));
  }, []);

  // Search users on the platform
  useEffect(() => {
    if (!searchQuery.trim() || !currentUser) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}&userId=${currentUser.id}`)
        .then(res => res.json())
        .then(results => setSearchResults(results))
        .catch(err => console.error('Search error:', err));
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, currentUser]);

  // Connect Socket.IO
  useEffect(() => {
    if (!currentUser) return;

    // Connect to host Socket server
    const socket = io('/', {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('user_online', currentUser.id);
    });

    // Handle incoming messages
    socket.on('new_message', (newMsg) => {
      setMessages(prev => {
        // Prevent duplicates
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      // Play sound
      if (newMsg.senderId !== currentUser.id) {
        soundEffects.playReceive();
      } else {
        soundEffects.playSend();
      }

      // Update conversation last message & re-sort
      setConversations(prev => {
        return prev.map(c => {
          if (c.id === newMsg.conversationId) {
            return {
              ...c,
              lastMessage: newMsg,
              unreadCount: (activeConversation?.id === c.id || newMsg.senderId === currentUser.id) 
                ? 0 
                : (c.unreadCount || 0) + 1
            };
          }
          return c;
        }).sort((a, b) => {
          const timeA = a.lastMessage?.createdAt || a.createdAt;
          const timeB = b.lastMessage?.createdAt || b.createdAt;
          return timeB - timeA;
        });
      });
    });

    // Handle reaction update
    socket.on('reaction_updated', ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          return { ...m, reactions };
        }
        return m;
      }));
      soundEffects.playReaction();
    });

    // Handle unsend
    socket.on('message_unsent', ({ messageId, isUnsent, text }) => {
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          return { ...m, isUnsent, text, fileUrl: null, replyTo: null, reactions: {} };
        }
        return m;
      }));
    });

    // Handle typing status
    socket.on('user_typing', ({ conversationId, userId, isTyping }) => {
      if (activeConversation?.id === conversationId) {
        setTypingUsers(prev => ({
          ...prev,
          [userId]: isTyping
        }));
      }
    });

    // Handle messages seen
    socket.on('messages_seen', ({ conversationId, userId, userAvatar }) => {
      if (activeConversation?.id === conversationId) {
        setMessages(prev => prev.map(m => {
          if (m.senderId === currentUser.id) {
            const seenBy = m.seenBy || [];
            if (!seenBy.includes(userId)) {
              return { ...m, status: 'seen', seenBy: [...seenBy, userId] };
            }
          }
          return m;
        }));
      }
    });

    // Handle presence updates
    socket.on('user_presence', ({ userId, online }) => {
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, online } : u));
      setConversations(prev => prev.map(c => {
        if (c.participants.includes(userId) && c.participants.find(p => p !== currentUser.id) === userId) {
          return { ...c, online };
        }
        return c;
      }));
    });

    // Handle theme update
    socket.on('theme_updated', ({ conversationId, theme, quickEmoji }) => {
      setActiveConversation(prev => (prev?.id === conversationId ? { ...prev, theme, quickEmoji } : prev));
      setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, theme, quickEmoji } : c));
    });

    // Handle new registered user
    socket.on('user_registered', (newUser) => {
      setAllUsers(prev => {
        if (prev.some(u => u.id === newUser.id)) return prev;
        return [...prev, newUser];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser, activeConversation?.id]);

  // Load conversations when currentUser changes
  useEffect(() => {
    if (!currentUser) return;
    fetch(`/api/conversations?userId=${currentUser.id}`)
      .then(res => res.json())
      .then(convs => {
        setConversations(convs);
        if (convs.length > 0 && !activeConversation) {
          selectConversation(convs[0]);
        }
      })
      .catch(err => console.error('Failed to load conversations:', err));
  }, [currentUser]);

  // Select a conversation and load messages
  const selectConversation = (conv) => {
    setActiveConversation(conv);
    setReplyingTo(null);
    setTypingUsers({});

    if (socketRef.current) {
      if (activeConversation) {
        socketRef.current.emit('leave_conversation', activeConversation.id);
      }
      socketRef.current.emit('join_conversation', conv.id);
      socketRef.current.emit('mark_seen', {
        conversationId: conv.id,
        userId: currentUser.id
      });
    }

    // Clear unread badge locally
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c));

    // Fetch messages
    fetch(`/api/messages/${conv.id}`)
      .then(res => res.json())
      .then(msgs => {
        setMessages(msgs);
      })
      .catch(err => console.error('Failed to load messages:', err));
  };

  // Switch Active User (Đức Anh <-> Bảo Long <-> Khánh Vy)
  const switchUser = (newUser) => {
    if (newUser.id === currentUser?.id) return;
    setCurrentUser(newUser);
    localStorage.setItem('messenger_active_user', JSON.stringify(newUser));
    setActiveConversation(null);
    setMessages([]);
    setIsUserSwitcherOpen(false);
  };

  // Auth: Login with @username
  const login = async (username) => {
    const res = await fetch('/api/auth/login', {
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

  // Auth: Register new account
  const register = async ({ name, username, avatar }) => {
    const res = await fetch('/api/auth/register', {
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
    if (socketRef.current) socketRef.current.disconnect();
    setCurrentUser(null);
    localStorage.removeItem('messenger_active_user');
    setActiveConversation(null);
    setConversations([]);
    setMessages([]);
  };

  // Start or open direct conversation with a user
  const startConversationWithUser = (targetUserId) => {
    if (targetUserId === currentUser.id) return;
    fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userA: currentUser.id, userB: targetUserId })
    })
      .then(res => res.json())
      .then(conv => {
        // Reload conversations to update state
        fetch(`/api/conversations?userId=${currentUser.id}`)
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
      reactions: {},
      createdAt: Date.now()
    };

    socketRef.current?.emit('send_message', messageData);
    setReplyingTo(null);

    // Stop typing
    sendTyping(false);
  };

  // Send Quick Like / Custom Emoji
  const sendQuickLike = () => {
    const emoji = activeConversation?.quickEmoji || '👍';
    sendMessage({ text: emoji, type: 'like' });
  };

  // Typing indicator trigger
  const sendTyping = (isTyping) => {
    if (!activeConversation || !currentUser || !socketRef.current) return;

    socketRef.current.emit('typing', {
      conversationId: activeConversation.id,
      userId: currentUser.id,
      isTyping
    });

    if (isTyping) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit('typing', {
          conversationId: activeConversation.id,
          userId: currentUser.id,
          isTyping: false
        });
      }, 2500);
    }
  };

  // Toggle Reaction on message
  const toggleReaction = (messageId, reaction) => {
    if (!activeConversation || !currentUser || !socketRef.current) return;
    socketRef.current.emit('toggle_reaction', {
      messageId,
      conversationId: activeConversation.id,
      userId: currentUser.id,
      reaction
    });
  };

  // Unsend Message
  const unsendMessage = (messageId) => {
    if (!activeConversation || !currentUser || !socketRef.current) return;
    socketRef.current.emit('unsend_message', {
      messageId,
      conversationId: activeConversation.id,
      userId: currentUser.id
    });
  };

  // Change conversation theme
  const updateTheme = (themeColor, quickEmoji) => {
    if (!activeConversation) return;
    fetch(`/api/conversations/${activeConversation.id}/theme`, {
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
        switchUser,
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
        isUserSwitcherOpen,
        setIsUserSwitcherOpen,
        searchQuery,
        setSearchQuery,
        searchResults
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
