import React, { useState, useRef } from 'react';
import { PlusCircle, Image, Smile, Send, X, Loader2, ThumbsUp } from 'lucide-react';
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
  const inputRef = useRef(null);

  const convTheme = activeConversation?.theme || '#0084FF';
  const quickEmoji = activeConversation?.quickEmoji || '👍';

  const wrapSelection = (wrapper) => {
    if (!inputRef.current) return;
    const input = inputRef.current;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const selected = text.slice(start, end);
    const replacement = selected ? `${wrapper}${selected}${wrapper}` : `${wrapper}${wrapper}`;
    const newText = text.slice(0, start) + replacement + text.slice(end);
    setText(newText);
    setTimeout(() => {
      input.focus();
      const cursor = selected ? start + replacement.length : start + wrapper.length;
      input.setSelectionRange(cursor, cursor);
    }, 10);
  };

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
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      wrapSelection('**');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      wrapSelection('*');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      wrapSelection('`');
      return;
    }

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
    <div className="px-3 py-2.5 bg-white dark:bg-[#18191a] relative">
      {/* Replying To Banner */}
      {replyingTo && (
        <div className="mb-2 px-3 py-2 bg-[#f0f2f5] dark:bg-[#242526] rounded-xl flex items-center justify-between text-xs text-[#050505] dark:text-[#e4e6eb]">
          <div className="min-w-0">
            <p className="font-semibold text-[12px]">
              Đang trả lời <span className="font-bold">{replyingTo.senderName || 'tin nhắn'}</span>
            </p>
            <p className="truncate text-[#65676b] dark:text-[#b0b3b8] mt-0.5">
              {replyingTo.type === 'image' ? 'Hình ảnh' : replyingTo.text}
            </p>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-[#3a3b3c] rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-[#65676b] dark:text-[#b0b3b8]" />
          </button>
        </div>
      )}

      {/* Emoji Picker Popup */}
      {showEmojiPicker && (
        <div className="absolute bottom-14 right-4 bg-white dark:bg-[#242526] p-3 rounded-2xl shadow-2xl border border-gray-100 dark:border-[#393a3b] grid grid-cols-8 gap-2 z-30 animate-pop-in">
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

      {/* Messenger Bottom Input Bar */}
      <div className="flex items-center space-x-1.5">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />

        {/* Left Messenger Action Icons */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          style={{ color: convTheme }}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f2f2f2] dark:hover:bg-[#28292a] transition-colors flex-shrink-0 disabled:opacity-50"
          title="Mở hành động khác"
        >
          <PlusCircle className="w-5 h-5" />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          style={{ color: convTheme }}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f2f2f2] dark:hover:bg-[#28292a] transition-colors flex-shrink-0 disabled:opacity-50"
          title="Đính kèm ảnh"
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Image className="w-5 h-5" />
          )}
        </button>

        {/* Rounded-full "Aa" Input Box */}
        <div className="flex-1 relative flex items-center bg-[#f0f2f5] dark:bg-[#3a3b3c] rounded-full px-3.5 py-2">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Aa"
            className="w-full bg-transparent text-[15px] text-[#050505] dark:text-[#e4e6eb] placeholder-[#65676b] dark:placeholder-[#b0b3b8] focus:outline-none"
          />

          <button
            type="button"
            onClick={() => setShowEmojiPicker(prev => !prev)}
            style={{ color: convTheme }}
            className="ml-2 hover:opacity-80 focus:outline-none flex-shrink-0"
            title="Chọn biểu tượng cảm xúc"
          >
            <Smile className="w-5 h-5" />
          </button>
        </div>

        {/* Right Send / ThumbsUp Button */}
        {text.trim() ? (
          <button
            onClick={handleSend}
            style={{ color: convTheme }}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f2f2f2] dark:hover:bg-[#28292a] transition-colors flex-shrink-0"
            title="Nhấn Enter để gửi"
          >
            <Send className="w-5 h-5 fill-current" />
          </button>
        ) : (
          <button
            onClick={sendQuickLike}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f2f2f2] dark:hover:bg-[#28292a] transition-transform active:scale-90 flex-shrink-0 select-none text-xl"
            title={`Gửi ${quickEmoji}`}
          >
            {quickEmoji === '👍' ? (
              <ThumbsUp style={{ color: convTheme }} className="w-5 h-5 fill-current" />
            ) : (
              <span>{quickEmoji}</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
