import React, { useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import MessageBubble from './MessageBubble';
import { Bot, Sparkles } from 'lucide-react';

export default function MessageList() {
  const { messages, activeConversation, typingUsers, currentUser } = useChat();
  const bottomRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  if (!activeConversation) return null;

  // Check which user is typing
  const typingUserIds = Object.entries(typingUsers)
    .filter(([userId, isTyping]) => isTyping && userId !== currentUser?.id)
    .map(([userId]) => userId);

  // Find the last message seen by the other participant
  const otherParticipantId = activeConversation.participants?.find(p => p !== currentUser?.id);
  let lastSeenMessageId = null;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.senderId === currentUser?.id && msg.seenBy?.includes(otherParticipantId)) {
      lastSeenMessageId = msg.id;
      break;
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
      {/* Conversation Starter Top Card */}
      <div className="py-8 flex flex-col items-center justify-center text-center">
        <div className="relative mb-3">
          <img
            src={activeConversation.avatar}
            alt={activeConversation.name}
            className="w-20 h-20 rounded-full object-cover shadow-md"
          />
          {activeConversation.isBot && (
            <span className="absolute -bottom-1 -right-1 p-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full text-white shadow-md">
              <Sparkles className="w-4 h-4" />
            </span>
          )}
        </div>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
          {activeConversation.name}
          {activeConversation.isBot && (
            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded-full flex items-center gap-1">
              <Bot className="w-3 h-3" /> AI
            </span>
          )}
        </h2>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
          {activeConversation.isBot
            ? 'Trợ lý ảo thông minh chạy trên Spring Boot, luôn sẵn sàng giải đáp thắc mắc và trò chuyện 24/7.'
            : 'Các bạn đã kết nối trên Messenger Web. Bắt đầu gửi tin nhắn hoặc biểu tượng cảm xúc!'}
        </p>
      </div>

      {/* Messages */}
      {messages.map((message, idx) => {
        const nextMsg = messages[idx + 1];
        const prevMsg = messages[idx - 1];

        const isLastInGroup = !nextMsg || nextMsg.senderId !== message.senderId;
        const isFirstInGroup = !prevMsg || prevMsg.senderId !== message.senderId;
        const isSeenByOther = message.id === lastSeenMessageId;

        return (
          <MessageBubble
            key={message.id || idx}
            message={message}
            isLastInGroup={isLastInGroup}
            isFirstInGroup={isFirstInGroup}
            isSeenByOther={isSeenByOther}
          />
        );
      })}

      {/* Typing Indicator */}
      {typingUserIds.length > 0 && (
        <div className="flex items-end space-x-2 mb-2 animate-pop-in">
          <img
            src={activeConversation.avatar}
            alt="typing"
            className="w-7 h-7 rounded-full object-cover mb-1"
          />
          <div className="px-4 py-3 bg-gray-100 dark:bg-[#303030] rounded-2xl rounded-bl-sm flex items-center space-x-1.5 shadow-sm">
            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce-dot-1"></span>
            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce-dot-2"></span>
            <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce-dot-3"></span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
