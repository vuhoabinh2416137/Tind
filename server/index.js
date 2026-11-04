import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { storage } from './storage.js';
import { generateBotReply } from './bot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// Upload directory setup
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

// Healthcheck endpoint for cloud monitoring & uptime
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

// REST APIs
app.get('/api/users', (req, res) => {
  res.json(storage.getUsers());
});

app.get('/api/users/search', (req, res) => {
  const { q, userId } = req.query;
  const results = storage.searchUsers(q, userId);
  res.json(results);
});

// Auth: Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, name, avatar, status } = req.body;
    const user = storage.registerUser({ username, name, avatar, status });
    // Notify all clients of new user
    io.emit('user_registered', user);
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Auth: Login
app.post('/api/auth/login', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Vui lòng cung cấp username' });
  const user = storage.getUserByUsername(username);
  if (!user) {
    return res.status(404).json({ error: 'Không tìm thấy tài khoản với username này' });
  }
  res.json(user);
});

app.get('/api/conversations', (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  const convs = storage.getConversationsForUser(userId);
  res.json(convs);
});

app.post('/api/conversations', (req, res) => {
  const { userA, userB } = req.body;
  if (!userA || !userB) return res.status(400).json({ error: 'userA and userB required' });
  const conv = storage.getOrCreateConversation(userA, userB);
  res.json(conv);
});

app.get('/api/messages/:conversationId', (req, res) => {
  const messages = storage.getMessages(req.params.conversationId);
  res.json(messages);
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    url: fileUrl,
    filename: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  });
});

app.post('/api/conversations/:id/theme', (req, res) => {
  const { theme, quickEmoji } = req.body;
  const updated = storage.updateConversationTheme(req.params.id, theme, quickEmoji);
  if (!updated) return res.status(404).json({ error: 'Conversation not found' });
  io.to(`conv_${req.params.id}`).emit('theme_updated', {
    conversationId: req.params.id,
    theme,
    quickEmoji
  });
  res.json(updated);
});

// User socket map
const onlineUsers = new Map(); // socketId -> userId

io.on('connection', (socket) => {
  // User connects
  socket.on('user_online', (userId) => {
    onlineUsers.set(socket.id, userId);
    storage.setUserOnline(userId, true);
    socket.join(`user_${userId}`);
    io.emit('user_presence', { userId, online: true });
  });

  // Join conversation room
  socket.on('join_conversation', (conversationId, ack) => {
    socket.join(`conv_${conversationId}`);
    if (typeof ack === 'function') ack();
  });

  // Leave conversation room
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conv_${conversationId}`);
  });

  // Send message
  socket.on('send_message', (messageData) => {
    const newMsg = storage.addMessage(messageData);

    // Broadcast to conversation room
    io.to(`conv_${newMsg.conversationId}`).emit('new_message', newMsg);

    // Notify participants
    const conv = storage.conversations.get(newMsg.conversationId);
    if (conv) {
      conv.participants.forEach(participantId => {
        io.to(`user_${participantId}`).emit('conversation_updated', {
          conversationId: conv.id,
          lastMessage: newMsg
        });
      });

      // Check if conversation involves Meta AI Bot
      if (conv.participants.includes('u_meta_ai') && newMsg.senderId !== 'u_meta_ai') {
        // Trigger typing indicator for bot
        setTimeout(() => {
          io.to(`conv_${conv.id}`).emit('user_typing', {
            conversationId: conv.id,
            userId: 'u_meta_ai',
            isTyping: true
          });
        }, 300);

        // Send bot reply
        setTimeout(() => {
          const replyText = generateBotReply(newMsg.text);
          const botMsg = storage.addMessage({
            conversationId: conv.id,
            senderId: 'u_meta_ai',
            text: replyText,
            type: 'text'
          });

          io.to(`conv_${conv.id}`).emit('user_typing', {
            conversationId: conv.id,
            userId: 'u_meta_ai',
            isTyping: false
          });
          io.to(`conv_${conv.id}`).emit('new_message', botMsg);
          io.to(`user_${newMsg.senderId}`).emit('conversation_updated', {
            conversationId: conv.id,
            lastMessage: botMsg
          });
        }, 1200);
      }
    }
  });

  // Typing status
  socket.on('typing', ({ conversationId, userId, isTyping }) => {
    socket.to(`conv_${conversationId}`).emit('user_typing', {
      conversationId,
      userId,
      isTyping
    });
  });

  // Toggle reaction
  socket.on('toggle_reaction', ({ messageId, conversationId, userId, reaction }) => {
    const updatedMsg = storage.toggleReaction(messageId, userId, reaction);
    if (updatedMsg) {
      io.to(`conv_${conversationId}`).emit('reaction_updated', {
        messageId,
        reactions: updatedMsg.reactions
      });
    }
  });

  // Unsend message
  socket.on('unsend_message', ({ messageId, conversationId, userId }) => {
    const unsentMsg = storage.unsendMessage(messageId, userId);
    if (unsentMsg) {
      io.to(`conv_${conversationId}`).emit('message_unsent', {
        messageId,
        isUnsent: true,
        text: unsentMsg.text
      });
    }
  });

  // Mark messages as seen
  socket.on('mark_seen', ({ conversationId, userId }) => {
    const updated = storage.markAsSeen(conversationId, userId);
    if (updated) {
      const user = storage.getUser(userId);
      io.to(`conv_${conversationId}`).emit('messages_seen', {
        conversationId,
        userId,
        userAvatar: user ? user.avatar : null,
        userName: user ? user.name : null
      });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    const userId = onlineUsers.get(socket.id);
    if (userId) {
      onlineUsers.delete(socket.id);
      // Check if user still has other open sockets
      const stillOnline = Array.from(onlineUsers.values()).includes(userId);
      if (!stillOnline) {
        storage.setUserOnline(userId, false);
        io.emit('user_presence', { userId, online: false });
      }
    }
  });
});

// Serve production frontend if built
const distDir = path.join(__dirname, '../dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Messenger Server] Running at http://0.0.0.0:${PORT}`);
});

export { app, server, io };
