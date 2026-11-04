import React from 'react';
import { X, Download } from 'lucide-react';
import { useChat } from '../context/ChatContext';

export default function MediaLightbox() {
  const { lightboxMedia, setLightboxMedia } = useChat();

  if (!lightboxMedia) return null;

  return (
    <div
      onClick={() => setLightboxMedia(null)}
      className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none animate-pop-in"
    >
      {/* Top Controls */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-4 right-4 flex items-center space-x-2 z-10"
      >
        <a
          href={lightboxMedia}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-sm"
          title="Tải ảnh về máy"
        >
          <Download className="w-5 h-5" />
        </a>
        <button
          onClick={() => setLightboxMedia(null)}
          className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-sm"
          title="Đóng (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Image Preview */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-w-4xl max-h-[85vh] flex items-center justify-center"
      >
        <img
          src={lightboxMedia}
          alt="full view"
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
        />
      </div>
    </div>
  );
}
