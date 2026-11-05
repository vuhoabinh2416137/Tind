import React, { useEffect, useRef } from 'react';
import { useChat, getDefaultAvatar } from '../context/ChatContext';
import MessageBubble from './MessageBubble';

export default function MessageList() {
  const { messages, activeConversation, typingUsers, currentUser } = useChat();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  if (!activeConversation) return null;

  const typingUserIds = Object.entries(typingUsers)
    .filter(([userId, isTyping]) => isTyping && userId !== currentUser?.id)
    .map(([userId]) => userId);

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
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {/* Messenger Profile Intro Card at top of conversation */}
      <div className="pt-6 pb-8 flex flex-col items-center justify-center text-center">
        <div className="relative mb-3">
          <img
            src={activeConversation.avatar || getDefaultAvatar(activeConversation.name)}
            alt={activeConversation.name}
            className="w-20 h-20 rounded-full object-cover"
          />
          {activeConversation.online && (
            <span className="absolute bottom-1 right-1 w-4 h-4 bg-[#31a24c] border-2 border-white dark:border-[#18191a] rounded-full" />
          )}
        </div>

        <h2 className="text-[17px] font-bold text-[#050505] dark:text-[#e4e6eb]">
          {activeConversation.name}
        </h2>

        <p className="text-[13px] text-[#65676b] dark:text-[#b0b3b8] mt-0.5">
          Messenger · Các bạn đã được kết nối trên Messenger
        </p>
      </div>

      {/* Messages Stack */}
      <div className="space-y-0.5">
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
      </div>

      {/* Typing Indicator */}
      {typingUserIds.length > 0 && (
        <div className="flex items-end space-x-2 mt-2 mb-2 animate-pop-in">
          <img
            src={activeConversation.avatar || getDefaultAvatar(activeConversation.name)}
            alt="typing"
            className="w-7 h-7 rounded-full object-cover mb-0.5"
          />
          <div className="px-4 py-3 bg-[#f0f2f5] dark:bg-[#303030] rounded-[18px] rounded-bl-[4px] flex items-center space-x-1">
            <span className="w-2 h-2 bg-[#65676b] dark:bg-[#b0b3b8] rounded-full animate-bounce-dot-1" />
            <span className="w-2 h-2 bg-[#65676b] dark:bg-[#b0b3b8] rounded-full animate-bounce-dot-2" />
            <span className="w-2 h-2 bg-[#65676b] dark:bg-[#b0b3b8] rounded-full animate-bounce-dot-3" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
