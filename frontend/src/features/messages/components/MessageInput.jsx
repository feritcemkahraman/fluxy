import React, { useState } from 'react';
import { 
  Send, 
  Paperclip, 
  X, 
  Image, 
  File,
  Smile
} from 'lucide-react';
import { EmojiGifPicker } from '../../../components/EmojiGifPicker';

import { useMessageInput } from '../hooks/useMessageInput';
import { useTypingIndicator } from '../hooks/useTypingIndicator';

/**
 * MessageInput Component - Discord Style
 * Advanced message input with file attachments, replies, and typing indicators
 */
const MessageInput = ({ 
  onSend, 
  channelId, 
  conversationId,
  placeholder = "Mesaj yazın...",
  disabled = false,
  currentUser
}) => {
  const {
    content,
    attachments,
    replyTo,
    isSending,
    error,
    canSend,
    remainingChars,
    textareaRef,
    fileInputRef,
    handleContentChange,
    handleFileSelect,
    handleKeyPress,
    handleSend,
    removeAttachment,
    clearReply,
    clearError
  } = useMessageInput(onSend, {
    placeholder,
    autoFocus: true
  });

  const { handleInputChange, handleSendMessage } = useTypingIndicator(
    channelId, 
    conversationId
  );

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleInputChangeWithTyping = (e) => {
    handleContentChange(e);
    handleInputChange(e.target.value);
  };

  const handleSendWithTyping = async () => {
    handleSendMessage();
    await handleSend();
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
    // Reset input
    e.target.value = '';
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-4 h-4" />;
    }
    return <File className="w-4 h-4" />;
  };

  if (disabled) {
    return (
      <div className="p-4 bg-gray-800/50 border-t border-gray-700">
        <div className="bg-gray-700 rounded-lg p-3 text-center text-gray-400">
          Bu kanala mesaj gönderme izniniz yok
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border-t border-gray-700">
      {/* Reply Preview */}
      {replyTo && (
        <div className="px-4 pt-3 pb-2">
          <div className="bg-gray-700/50 rounded-lg p-3 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-400 mb-1">
                  Yanıtlanıyor: {replyTo.author?.displayName || replyTo.author?.username}
                </div>
                <div className="text-sm text-gray-300 truncate">
                  {replyTo.content}
                </div>
              </div>
              <button
                onClick={clearReply}
                className="ml-2 p-1 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Attachments Preview */}
      {attachments.length > 0 && (
        <div className="px-4 pt-3 pb-2">
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="relative bg-gray-700 rounded-lg p-2 flex items-center space-x-2 max-w-xs"
              >
                {attachment.preview ? (
                  <img
                    src={attachment.preview}
                    alt={attachment.name}
                    className="w-8 h-8 rounded object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center">
                    {getFileIcon(attachment)}
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">
                    {attachment.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    {(attachment.size / 1024 / 1024).toFixed(1)} MB
                  </div>
                </div>

                <button
                  onClick={() => removeAttachment(attachment.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="px-4 pt-2">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-2 flex items-center justify-between">
            <span className="text-red-400 text-sm">{error}</span>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4">
        <div className="bg-gray-700 rounded-lg flex items-end space-x-2 p-2">
          {/* File Upload Button - Disabled */}
          <button
            disabled
            className="flex-shrink-0 p-2 text-gray-600 cursor-not-allowed rounded opacity-50"
            title="Dosya ekleme devre dışı"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleInputChangeWithTyping}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              className="w-full bg-transparent text-white placeholder-gray-400 resize-none focus:outline-none max-h-32"
              rows={1}
            />
          </div>

          {/* Emoji/GIF Button */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded"
              title="Emoji & GIF"
            >
              <Smile className="w-5 h-5" />
            </button>
            
            {showEmojiPicker && (
              <EmojiGifPicker
                onSelect={(content, type) => {
                  if (type === 'gif') {
                    // Send GIF directly
                    handleContentChange({ target: { value: content } });
                    setTimeout(() => handleSendWithTyping(), 100);
                  } else {
                    // Add emoji to message
                    const newContent = (textareaRef.current?.value || '') + content;
                    handleContentChange({ target: { value: newContent } });
                    textareaRef.current?.focus();
                  }
                  setShowEmojiPicker(false);
                }}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendWithTyping}
            disabled={!canSend}
            className={`flex-shrink-0 p-2 rounded transition-all duration-200 ${
              canSend
                ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 hover:scale-110'
                : 'text-gray-600 cursor-not-allowed'
            } ${isSending ? 'animate-pulse' : ''}`}
            title={isSending ? 'Gönderiliyor...' : 'Gönder'}
          >
            <Send className={`w-5 h-5 ${isSending ? 'animate-bounce' : ''}`} />
          </button>
        </div>

        {/* Character Counter */}
        {content.length > 1800 && (
          <div className="mt-1 text-right">
            <span className={`text-xs ${
              remainingChars < 0 ? 'text-red-400' : 'text-gray-400'
            }`}>
              {remainingChars} karakter kaldı
            </span>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar"
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );
};

export default MessageInput;
