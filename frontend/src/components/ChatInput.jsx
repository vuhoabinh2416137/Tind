import React, { useState, useRef } from 'react';
import { Image, Smile, Send, X, Loader2, ThumbsUp } from 'lucide-react';
import { useChat } from '../context/ChatContext';

const COMMON_EMOJIS = ['😀', '😂', '😍', '❤️', '🔥', '✨', '👍', '🎉', '🚀', '💯', '🙌', '☕', '😎', '🥳', '🤔', '👀'];

export default function ChatInput() {
  const {
    activeConversation,
    sendMessage,
    sendQuickLike,
    sendTyping,
    replyingTo,
    setReplyingTo,
    API_URL
  } = useChat();

  const [text, setText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);

  const convTheme = activeConversation?.theme || '#0084FF';
  const quickEmoji = activeConversation?.quickEmoji || '👍';

  const handleTextChange = (e) => {
    setText(e.target.value);
    sendTyping(true);
  };

  const handleSend = () => {
    if (!text.trim()) return;
    sendMessage({ text: text.trim(), type: 'text' });
    setText('');
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data.url) {
        sendMessage({
          type: 'image',
          fileUrl: data.url,
          text: text.trim()
        });
        setText('');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Không thể tải tệp lên, vui lòng thử lại.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addEmoji = (emoji) => {
    setText(prev => prev + emoji);
  };

  return (
    <div className="p-3 bg-white dark:bg-[#18191a] border-t border-gray-200 dark:border-[#2f3031] relative">
      {/* Replying To Banner */}
      {replyingTo && (
        <div className="mb-2 px-3 py-1.5 bg-gray-100 dark:bg-[#28292a] rounded-xl flex items-center justify-between text-xs text-gray-700 dark:text-gray-300">
          <div className="flex items-center space-x-1.5 truncate">
            <span className="font-semibold text-messenger-blue">Đang trả lời:</span>
            <span className="truncate italic">"{replyingTo.type === 'image' ? '[Hình ảnh]' : replyingTo.text}"</span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-[#38393a] rounded-full transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Emoji Picker Popup */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 right-4 bg-white dark:bg-[#242526] p-3 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 grid grid-cols-8 gap-2 z-30 animate-pop-in">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => addEmoji(emoji)}
              className="text-2xl hover:scale-125 transition-transform p-1 rounded hover:bg-gray-100 dark:hover:bg-[#3a3b3c]"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Main Input Row */}
      <div className="flex items-center space-x-2">
        {/* Attachment / Image Button */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="p-2 text-messenger-blue hover:bg-blue-50 dark:hover:bg-[#28292a] rounded-full transition-colors flex-shrink-0 disabled:opacity-50"
          title="Gửi hình ảnh"
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Image className="w-5 h-5" />
          )}
        </button>

        {/* Text Input Box */}
        <div className="flex-1 relative flex items-center bg-gray-100 dark:bg-[#242526] rounded-full px-4 py-2">
          <input
            type="text"
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tin nhắn..."
            className="w-full bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none"
          />

          {/* Emoji Toggle inside input */}
          <button
            onClick={() => setShowEmojiPicker(prev => !prev)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-2 focus:outline-none"
            title="Biểu tượng cảm xúc"
          >
            <Smile className="w-5 h-5" />
          </button>
        </div>

        {/* Action Button: Send or Quick Like */}
        {text.trim() ? (
          <button
            onClick={handleSend}
            style={{ backgroundColor: convTheme }}
            className="p-2 text-white rounded-full hover:opacity-90 active:scale-95 transition-all shadow-md flex-shrink-0"
            title="Gửi"
          >
            <Send className="w-5 h-5 fill-current" />
          </button>
        ) : (
          <button
            onClick={sendQuickLike}
            className="p-1.5 text-2xl hover:scale-120 active:scale-90 transition-transform flex-shrink-0 select-none"
            title={`Gửi biểu tượng ${quickEmoji}`}
          >
            {quickEmoji === '👍' ? (
              <div
                style={{ color: convTheme }}
                className="w-6 h-6 flex items-center justify-center font-bold"
              >
                <ThumbsUp className="w-5 h-5 fill-current" />
              </div>
            ) : (
              <span>{quickEmoji}</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
