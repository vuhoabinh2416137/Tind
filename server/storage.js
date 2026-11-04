import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, '../data/messenger_db.json');

// Ensure data folder exists
const dataDir = path.dirname(DB_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initial Seed Users
const DEFAULT_USERS = [
  {
    id: 'u_ducanh',
    username: 'ducanh',
    name: 'Đức Anh',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    status: 'Sống trọn từng khoảnh khắc ✨',
    online: true,
    lastSeen: Date.now()
  },
  {
    id: 'u_baolong',
    username: 'baolong',
    name: 'Bảo Long',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    status: 'Đang code dự án mới 💻',
    online: true,
    lastSeen: Date.now()
  },
  {
    id: 'u_khanhvy',
    username: 'khanhvy',
    name: 'Khánh Vy',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    status: 'Coffee & Books ☕📖',
    online: true,
    lastSeen: Date.now()
  },
  {
    id: 'u_meta_ai',
    username: 'meta_ai',
    name: 'Meta AI',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
    status: 'Trợ lý thông minh luôn sẵn sàng 🤖',
    isBot: true,
    online: true,
    lastSeen: Date.now()
  }
];

// Initial Seed Conversations
const DEFAULT_CONVERSATIONS = [
  {
    id: 'c_ducanh_baolong',
    type: 'direct',
    participants: ['u_ducanh', 'u_baolong'],
    theme: '#0084FF',
    quickEmoji: '👍',
    createdAt: Date.now() - 3600000 * 24
  },
  {
    id: 'c_ducanh_khanhvy',
    type: 'direct',
    participants: ['u_ducanh', 'u_khanhvy'],
    theme: '#E4405F',
    quickEmoji: '❤️',
    createdAt: Date.now() - 3600000 * 48
  },
  {
    id: 'c_ducanh_meta_ai',
    type: 'direct',
    participants: ['u_ducanh', 'u_meta_ai'],
    theme: '#7B2CBF',
    quickEmoji: '✨',
    createdAt: Date.now() - 3600000 * 72
  }
];

// Initial Seed Messages
const DEFAULT_MESSAGES = [
  {
    id: 'm_1',
    conversationId: 'c_ducanh_baolong',
    senderId: 'u_baolong',
    text: 'Chào Đức Anh! Cậu đang làm gì đó? Dự án chat Messenger thế nào rồi?',
    type: 'text',
    createdAt: Date.now() - 3600000 * 3,
    status: 'seen',
    seenBy: ['u_ducanh'],
    reactions: { '❤️': ['u_ducanh'] }
  },
  {
    id: 'm_2',
    conversationId: 'c_ducanh_baolong',
    senderId: 'u_ducanh',
    text: 'Chào Long! Đang triển khai giao diện và Socket.IO mượt lắm nè 🚀',
    type: 'text',
    createdAt: Date.now() - 3600000 * 2,
    status: 'seen',
    seenBy: ['u_baolong'],
    reactions: { '👍': ['u_baolong'] }
  },
  {
    id: 'm_3',
    conversationId: 'c_ducanh_baolong',
    senderId: 'u_baolong',
    text: 'Tuyệt vời luôn! Có hỗ trợ gửi ảnh và icon thả cảm xúc không?',
    type: 'text',
    createdAt: Date.now() - 3600000 * 1,
    status: 'seen',
    seenBy: ['u_ducanh'],
    reactions: {}
  },
  {
    id: 'm_4',
    conversationId: 'c_ducanh_khanhvy',
    senderId: 'u_khanhvy',
    text: 'Đức Anh ơi, mai có đi học nhóm ở thư viện không?',
    type: 'text',
    createdAt: Date.now() - 3600000 * 5,
    status: 'seen',
    seenBy: ['u_ducanh'],
    reactions: { '👍': ['u_ducanh'] }
  },
  {
    id: 'm_5',
    conversationId: 'c_ducanh_meta_ai',
    senderId: 'u_meta_ai',
    text: 'Xin chào Đức Anh! Tôi là Meta AI. Tôi có thể hỗ trợ bạn trả lời câu hỏi, gợi ý ý tưởng hoặc trò chuyện bất kỳ lúc nào!',
    type: 'text',
    createdAt: Date.now() - 3600000 * 10,
    status: 'seen',
    seenBy: ['u_ducanh'],
    reactions: { '✨': ['u_ducanh'] }
  }
];

class Storage {
  constructor() {
    this.users = new Map();
    this.conversations = new Map();
    this.messages = [];
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        (data.users || DEFAULT_USERS).forEach(u => {
          if (!u.username) u.username = u.id.replace('u_', '');
          this.users.set(u.id, u);
        });
        (data.conversations || DEFAULT_CONVERSATIONS).forEach(c => this.conversations.set(c.id, c));
        this.messages = data.messages || DEFAULT_MESSAGES;
        return;
      }
    } catch (err) {
      console.error('Error loading db file, falling back to defaults:', err);
    }

    // Initialize with defaults
    DEFAULT_USERS.forEach(u => this.users.set(u.id, u));
    DEFAULT_CONVERSATIONS.forEach(c => this.conversations.set(c.id, c));
    this.messages = [...DEFAULT_MESSAGES];
    this.save();
  }

  save() {
    try {
      const data = {
        users: Array.from(this.users.values()),
        conversations: Array.from(this.conversations.values()),
        messages: this.messages
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving db file:', err);
    }
  }

  getUsers() {
    return Array.from(this.users.values());
  }

  getUser(id) {
    return this.users.get(id);
  }

  getUserByUsername(username) {
    if (!username) return null;
    const cleanUsername = username.toLowerCase().replace('@', '').trim();
    return Array.from(this.users.values()).find(
      u => u.username?.toLowerCase() === cleanUsername
    );
  }

  registerUser({ username, name, avatar, status }) {
    if (!username || !name) {
      throw new Error('Vui lòng cung cấp đầy đủ Tên và Tên người dùng');
    }
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '').trim();
    if (!cleanUsername) {
      throw new Error('Tên người dùng không hợp lệ (chỉ gồm chữ cái, số và dấu gạch dưới)');
    }

    // Check if username already exists
    if (this.getUserByUsername(cleanUsername)) {
      throw new Error('Tên người dùng này đã tồn tại, vui lòng chọn tên khác');
    }

    const userId = `u_${cleanUsername}_${Math.random().toString(36).substring(2, 6)}`;
    const defaultAvatars = [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150'
    ];

    const newUser = {
      id: userId,
      username: cleanUsername,
      name: name.trim(),
      avatar: avatar || defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)],
      status: status || 'Mới tham gia Messenger 🚀',
      online: true,
      lastSeen: Date.now(),
      createdAt: Date.now()
    };

    this.users.set(newUser.id, newUser);

    // Auto create a welcome conversation with Meta AI Bot
    const aiBot = this.getUser('u_meta_ai');
    if (aiBot) {
      const conv = this.getOrCreateConversation(newUser.id, 'u_meta_ai');
      this.addMessage({
        conversationId: conv.id,
        senderId: 'u_meta_ai',
        text: `Xin chào ${newUser.name}! Chào mừng bạn gia nhập Messenger Web. Hãy thử nhắn tin hoặc tìm kiếm bạn bè bằng @username nhé! 🎉`,
        type: 'text'
      });
    }

    this.save();
    return newUser;
  }

  searchUsers(query, excludeUserId) {
    if (!query) return [];
    const q = query.toLowerCase().replace('@', '').trim();
    return Array.from(this.users.values())
      .filter(u => u.id !== excludeUserId && (
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.name && u.name.toLowerCase().includes(q))
      ))
      .slice(0, 10);
  }

  setUserOnline(id, online) {
    const user = this.users.get(id);
    if (user) {
      user.online = online;
      user.lastSeen = Date.now();
      this.save();
    }
    return user;
  }

  getConversationsForUser(userId) {
    const userConversations = Array.from(this.conversations.values()).filter(c =>
      c.participants.includes(userId)
    );

    return userConversations.map(c => {
      // Find other participant
      const otherParticipantId = c.participants.find(p => p !== userId) || userId;
      const otherParticipant = this.getUser(otherParticipantId) || {
        id: otherParticipantId,
        name: 'Người dùng',
        avatar: '',
        online: false
      };

      // Get last message
      const conversationMessages = this.messages.filter(m => m.conversationId === c.id);
      const lastMessage = conversationMessages[conversationMessages.length - 1] || null;

      // Count unread
      const unreadCount = conversationMessages.filter(
        m => m.senderId !== userId && (!m.seenBy || !m.seenBy.includes(userId))
      ).length;

      return {
        ...c,
        name: otherParticipant.name,
        avatar: otherParticipant.avatar,
        online: otherParticipant.online,
        lastSeen: otherParticipant.lastSeen,
        isBot: otherParticipant.isBot,
        lastMessage,
        unreadCount
      };
    }).sort((a, b) => {
      const timeA = a.lastMessage?.createdAt || a.createdAt;
      const timeB = b.lastMessage?.createdAt || b.createdAt;
      return timeB - timeA;
    });
  }

  getOrCreateConversation(userA, userB) {
    let conv = Array.from(this.conversations.values()).find(
      c => c.type === 'direct' && c.participants.includes(userA) && c.participants.includes(userB)
    );

    if (!conv) {
      conv = {
        id: `c_${[userA, userB].sort().join('_')}`,
        type: 'direct',
        participants: [userA, userB],
        theme: '#0084FF',
        quickEmoji: '👍',
        createdAt: Date.now()
      };
      this.conversations.set(conv.id, conv);
      this.save();
    }

    return conv;
  }

  getMessages(conversationId) {
    return this.messages.filter(m => m.conversationId === conversationId);
  }

  addMessage(msg) {
    const newMsg = {
      id: msg.id || `m_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      text: msg.text || '',
      type: msg.type || 'text', // text, image, like, file, voice
      fileUrl: msg.fileUrl || null,
      replyTo: msg.replyTo || null,
      reactions: msg.reactions || {},
      status: 'sent', // sent, delivered, seen
      seenBy: [msg.senderId],
      isUnsent: false,
      createdAt: msg.createdAt || Date.now()
    };

    this.messages.push(newMsg);
    this.save();
    return newMsg;
  }

  toggleReaction(messageId, userId, reaction) {
    const msg = this.messages.find(m => m.id === messageId);
    if (!msg) return null;

    if (!msg.reactions) msg.reactions = {};

    // Remove user's previous reactions on this message
    for (const key of Object.keys(msg.reactions)) {
      if (Array.isArray(msg.reactions[key])) {
        msg.reactions[key] = msg.reactions[key].filter(u => u !== userId);
        if (msg.reactions[key].length === 0) {
          delete msg.reactions[key];
        }
      }
    }

    // Toggle reaction
    if (!msg.reactions[reaction]) {
      msg.reactions[reaction] = [];
    }
    msg.reactions[reaction].push(userId);

    this.save();
    return msg;
  }

  unsendMessage(messageId, userId) {
    const msg = this.messages.find(m => m.id === messageId);
    if (!msg) return null;
    if (msg.senderId !== userId) return null; // Only sender can unsend

    msg.isUnsent = true;
    msg.text = 'Tin nhắn đã được thu hồi';
    msg.fileUrl = null;
    msg.replyTo = null;
    msg.reactions = {};

    this.save();
    return msg;
  }

  markAsSeen(conversationId, userId) {
    let updated = false;
    this.messages.forEach(m => {
      if (m.conversationId === conversationId && m.senderId !== userId) {
        if (!m.seenBy) m.seenBy = [];
        if (!m.seenBy.includes(userId)) {
          m.seenBy.push(userId);
          m.status = 'seen';
          updated = true;
        }
      }
    });

    if (updated) {
      this.save();
    }
    return updated;
  }

  updateConversationTheme(conversationId, theme, quickEmoji) {
    const conv = this.conversations.get(conversationId);
    if (conv) {
      if (theme) conv.theme = theme;
      if (quickEmoji) conv.quickEmoji = quickEmoji;
      this.save();
    }
    return conv;
  }
}

export const storage = new Storage();
