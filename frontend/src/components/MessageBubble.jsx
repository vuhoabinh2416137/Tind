import React, { useState } from 'react';
import { Reply, Trash2, Copy, Check, Smile } from 'lucide-react';
import { useChat, getDefaultAvatar } from '../context/ChatContext';
import DraftyRenderer from './DraftyRenderer';

const EMOJI_REACTIONS = ['❤️', '😆', '😮', '😢', '😠', '👍'];

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

  // Authentic Messenger grouped corner rounding
  const getBubbleRadiusClass = () => {
    if (isSender) {
      if (isFirstInGroup && isLastInGroup) return 'rounded-[18px]';
      if (isFirstInGroup) return 'rounded-[18px] rounded-br-[4px]';
      if (isLastInGroup) return 'rounded-[18px] rounded-tr-[4px]';
      return 'rounded-[18px] rounded-r-[4px]';
    } else {
      if (isFirstInGroup && isLastInGroup) return 'rounded-[18px]';
      if (isFirstInGroup) return 'rounded-[18px] rounded-bl-[4px]';
      if (isLastInGroup) return 'rounded-[18px] rounded-tl-[4px]';
      return 'rounded-[18px] rounded-l-[4px]';
    }
  };

  return (
    <div
      className={`group relative flex flex-col select-text ${
        isSender ? 'items-end' : 'items-start'
      } ${isLastInGroup ? 'mb-2.5' : 'mb-[2px]'} ${totalReactions > 0 ? 'pb-2.5' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactionsBar(false);
      }}
    >
      {/* Reply Quote Banner */}
      {message.replyTo && !message.isUnsent && (
        <div
          className={`flex items-center text-[12px] text-[#65676b] dark:text-[#b0b3b8] mb-1 px-3 py-1.5 bg-[#f0f2f5]/70 dark:bg-[#28292a] rounded-2xl max-w-xs truncate ${
            isSender ? 'mr-1' : 'ml-9'
          }`}
        >
          <Reply className="w-3 h-3 mr-1.5 flex-shrink-0" />
          <span className="truncate">{message.replyTo.text}</span>
        </div>
      )}

      {/* Main Bubble Row */}
      <div className={`flex items-end max-w-[75%] md:max-w-[65%] ${isSender ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Receiver 28x28 Avatar on last message in group */}
        {!isSender && (
          <div className="w-7 h-7 flex-shrink-0 mr-2">
            {isLastInGroup ? (
              <img
                src={activeConversation?.avatar || getDefaultAvatar(activeConversation?.name)}
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
            <div className="px-3.5 py-2 rounded-[18px] border border-[#ced0d4] dark:border-[#3e4042] text-[#65676b] dark:text-[#b0b3b8] italic text-[14px]">
              {message.text || 'Tin nhắn đã bị thu hồi'}
            </div>
          ) : message.type === 'like' ? (
            <div className="text-4xl py-1 select-none transform hover:scale-110 active:scale-95 transition-transform duration-150 animate-pop-in">
              {message.text}
            </div>
          ) : message.type === 'image' ? (
            <div className={`overflow-hidden ${getBubbleRadiusClass()} bg-[#f0f2f5] dark:bg-[#303030]`}>
              <img
                src={message.fileUrl}
                alt="attachment"
                onClick={() => setLightboxMedia(message.fileUrl)}
                className="max-h-80 w-auto object-cover cursor-pointer hover:brightness-95 transition-all"
              />
              {message.text && (
                <div className="p-2.5 text-[15px] text-[#050505] dark:text-[#e4e6eb]">
                  <DraftyRenderer
                    content={message.drafty || message.text}
                    onMediaClick={(url) => setLightboxMedia(url)}
                  />
                </div>
              )}
            </div>
          ) : (
            <div
              style={isSender ? { backgroundColor: convTheme } : {}}
              className={`px-3 py-2 ${getBubbleRadiusClass()} text-[15px] leading-[1.34] break-words ${
                isSender
                  ? 'text-white'
                  : 'bg-[#f0f2f5] dark:bg-[#303030] text-[#050505] dark:text-[#e4e6eb]'
              }`}
            >
              <DraftyRenderer
                content={message.drafty || message.text}
                onMediaClick={(url) => setLightboxMedia(url)}
              />
            </div>
          )}

          {/* Reaction Pills Overlay */}
          {totalReactions > 0 && !message.isUnsent && (
            <div
              className={`absolute -bottom-2.5 flex items-center bg-white dark:bg-[#242526] px-1.5 py-0.5 rounded-full shadow border border-gray-100 dark:border-[#393a3b] text-xs cursor-pointer ${
                isSender ? 'right-1' : 'left-1'
              }`}
            >
              <span className="flex items-center -space-x-0.5">
                {activeReactionEntries.map(([emoji]) => (
                  <span key={emoji} className="text-[12px]">
                    {emoji}
                  </span>
                ))}
              </span>
              {totalReactions > 1 && (
                <span className="ml-1 text-[11px] font-medium text-[#65676b] dark:text-[#b0b3b8]">
                  {totalReactions}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Hover Actions Toolbar */}
        {showActions && !message.isUnsent && (
          <div className={`relative flex items-center mx-2 space-x-0.5 text-[#65676b] dark:text-[#b0b3b8] animate-pop-in`}>
            {/* Emoji Reaction Picker Popover */}
            {showReactionsBar && (
              <div
                className={`absolute bottom-9 ${
                  isSender ? 'right-0' : 'left-0'
                } bg-white dark:bg-[#242526] px-2.5 py-1.5 rounded-full shadow-xl border border-gray-100 dark:border-[#393a3b] flex items-center space-x-1.5 z-30 animate-pop-in`}
              >
                {EMOJI_REACTIONS.map(emoji => {
                  const hasReacted = reactions[emoji]?.includes(currentUser?.id);
                  return (
                    <button
                      key={emoji}
                      onClick={() => {
                        toggleReaction(message.id, emoji);
                        setShowReactionsBar(false);
                      }}
                      className={`text-xl hover:scale-125 transition-transform p-1 rounded-full ${
                        hasReacted ? 'bg-blue-50 dark:bg-[#3a3b3c]' : ''
                      }`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => setShowReactionsBar(prev => !prev)}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f2f2f2] dark:hover:bg-[#3a3b3c] transition-colors"
              title="Bày tỏ cảm xúc"
            >
              <Smile className="w-4 h-4" />
            </button>

            <button
              onClick={() => setReplyingTo(message)}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f2f2f2] dark:hover:bg-[#3a3b3c] transition-colors"
              title="Trả lời"
            >
              <Reply className="w-4 h-4" />
            </button>

            {message.text && message.type === 'text' && (
              <button
                onClick={handleCopy}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f2f2f2] dark:hover:bg-[#3a3b3c] transition-colors"
                title="Sao chép"
              >
                {copied ? <Check className="w-4 h-4 text-[#31a24c]" /> : <Copy className="w-4 h-4" />}
              </button>
            )}

            {isSender && (
              <button
                onClick={() => unsendMessage(message.id)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f2f2f2] dark:hover:bg-[#3a3b3c] hover:text-[#e41e3f] transition-colors"
                title="Thu hồi"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Seen Avatar Indicator below last seen message */}
      {isSeenByOther && (
        <div className="mt-1 mr-1 flex items-center justify-end">
          <img
            src={activeConversation?.avatar || getDefaultAvatar(activeConversation?.name)}
            alt="Đã xem"
            className="w-3.5 h-3.5 rounded-full object-cover"
            title={`Đã xem bởi ${activeConversation?.name}`}
          />
        </div>
      )}
    </div>
  );
}
