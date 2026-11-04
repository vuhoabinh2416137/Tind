import React, { useState } from 'react';
import { Reply, MoreHorizontal, Trash2, Copy, Check } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { formatMessageTime } from '../utils/date';

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export default function MessageBubble({ message, isLastInGroup, isFirstInGroup, isSeenByOther }) {
  const {
    currentUser,
    activeConversation,
    toggleReaction,
    unsendMessage,
    setReplyingTo,
    setLightboxMedia
  } = useChat();

  const [showActions, setShowActions] = useState(false);
  const [showReactionsBar, setShowReactionsBar] = useState(false);
  const [copied, setCopied] = useState(false);

  const isSender = message.senderId === currentUser?.id;
  const convTheme = activeConversation?.theme || '#0084FF';

  // Format reactions map: { '❤️': ['u1', 'u2'] }
  const reactions = message.reactions || {};
  const activeReactionEntries = Object.entries(reactions).filter(([_, users]) => users.length > 0);
  const totalReactions = activeReactionEntries.reduce((acc, [_, users]) => acc + users.length, 0);

  const handleCopy = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div
      className={`group relative flex flex-col mb-1 select-text ${
        isSender ? 'items-end' : 'items-start'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactionsBar(false);
      }}
    >
      {/* Reply Quote Banner */}
      {message.replyTo && !message.isUnsent && (
        <div
          className={`flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1 px-3 py-1 bg-gray-100 dark:bg-[#28292a] rounded-lg max-w-sm truncate border-l-2 ${
            isSender ? 'border-messenger-blue mr-2' : 'border-gray-400 ml-10'
          }`}
        >
          <Reply className="w-3 h-3 mr-1.5 flex-shrink-0" />
          <span className="font-semibold mr-1">{message.replyTo.senderName}:</span>
          <span className="truncate">{message.replyTo.text}</span>
        </div>
      )}

      {/* Main Bubble Row */}
      <div className={`flex items-end max-w-[85%] md:max-w-[70%] ${isSender ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Receiver Avatar */}
        {!isSender && (
          <div className="w-7 h-7 flex-shrink-0 mr-2 mb-1">
            {isLastInGroup ? (
              <img
                src={activeConversation?.avatar}
                alt={activeConversation?.name}
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : (
              <div className="w-7" />
            )}
          </div>
        )}

        {/* Message Content Container */}
        <div className="relative">
          {message.isUnsent ? (
            /* Unsent message bubble */
            <div className="px-4 py-2 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 italic text-sm">
              {message.text}
            </div>
          ) : message.type === 'like' ? (
            /* Quick Like / Large Emoji */
            <div className="text-4xl py-1 select-none transform hover:scale-110 active:scale-95 transition-transform duration-150 animate-pop-in">
              {message.text}
            </div>
          ) : message.type === 'image' ? (
            /* Image Bubble */
            <div className="overflow-hidden rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-[#242526]">
              <img
                src={message.fileUrl}
                alt="attachment"
                onClick={() => setLightboxMedia(message.fileUrl)}
                className="max-h-80 w-auto object-cover cursor-pointer hover:opacity-95 transition-opacity"
              />
              {message.text && (
                <p className="p-2.5 text-sm text-gray-900 dark:text-gray-100">
                  {message.text}
                </p>
              )}
            </div>
          ) : (
            /* Text Bubble */
            <div
              style={isSender ? { backgroundColor: convTheme } : {}}
              className={`px-3.5 py-2 rounded-2xl text-[14.5px] leading-relaxed break-words shadow-sm ${
                isSender
                  ? 'text-white rounded-br-sm'
                  : 'bg-gray-100 dark:bg-[#303030] text-gray-900 dark:text-[#f0f2f5] rounded-bl-sm'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Reaction Pills Overlay */}
          {totalReactions > 0 && !message.isUnsent && (
            <div
              className={`absolute -bottom-2 flex items-center bg-white dark:bg-[#242526] px-1.5 py-0.5 rounded-full shadow-md border border-gray-200 dark:border-gray-700 text-xs cursor-pointer hover:scale-105 transition-transform ${
                isSender ? 'right-1' : 'left-1'
              }`}
              title="Cảm xúc trên tin nhắn"
            >
              <span className="flex items-center -space-x-1">
                {activeReactionEntries.map(([emoji]) => (
                  <span key={emoji} className="text-xs">
                    {emoji}
                  </span>
                ))}
              </span>
              {totalReactions > 1 && (
                <span className="ml-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                  {totalReactions}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Hover Action Bar */}
        {showActions && !message.isUnsent && (
          <div
            className={`flex items-center space-x-1 px-1.5 py-1 bg-white dark:bg-[#242526] rounded-full shadow-lg border border-gray-200 dark:border-gray-700 mx-2 animate-pop-in z-20 ${
              isSender ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* Reactions Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowReactionsBar(prev => !prev)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-[#3a3b3c] text-gray-500 hover:text-amber-500 text-sm transition-colors"
                title="Bày tỏ cảm xúc"
              >
                😊
              </button>

              {/* Reaction Popup Palette */}
              {showReactionsBar && (
                <div
                  className={`absolute -top-11 flex items-center bg-white dark:bg-[#242526] px-2 py-1.5 rounded-full shadow-xl border border-gray-200 dark:border-gray-700 space-x-1.5 z-30 animate-pop-in ${
                    isSender ? 'right-0' : 'left-0'
                  }`}
                >
                  {EMOJI_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        toggleReaction(message.id, emoji);
                        setShowReactionsBar(false);
                      }}
                      className="text-lg hover:scale-130 active:scale-95 transition-transform duration-150"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reply Button */}
            <button
              onClick={() => setReplyingTo(message)}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-[#3a3b3c] text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
              title="Trả lời"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>

            {/* Copy Button */}
            {message.text && (
              <button
                onClick={handleCopy}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-[#3a3b3c] text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
                title="Sao chép"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Unsend / Delete for sender */}
            {isSender && (
              <button
                onClick={() => unsendMessage(message.id)}
                className="p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-500 hover:text-red-500 transition-colors"
                title="Thu hồi tin nhắn"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Seen Indicator Avatar */}
      {isSender && isSeenByOther && (
        <div className="flex justify-end mt-1 mr-1">
          <img
            src={activeConversation?.avatar}
            alt="seen"
            className="w-3.5 h-3.5 rounded-full object-cover border border-white dark:border-[#18191a]"
            title={`Đã xem bởi ${activeConversation?.name}`}
          />
        </div>
      )}
    </div>
  );
}
