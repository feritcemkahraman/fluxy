import React, { useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { 
  MoreHorizontal, 
  Reply, 
  Edit3, 
  Trash2, 
  Copy,
  AlertCircle,
  RefreshCw,
  Phone,
  PhoneOff,
  PhoneMissed
} from 'lucide-react';

import { MESSAGE_REACTIONS } from '../constants';

/**
 * MessageItem Component - Discord Style
 * Individual message display with reactions, replies, and actions
 */
const MessageItem = ({ 
  message, 
  currentUser, 
  onReply, 
  onEdit, 
  onDelete, 
  onReaction,
  onRetry,
  showAvatar = true,
  compact = false 
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  const isOwn = message.author?.id === currentUser?.id;
  const isOptimistic = message.isOptimistic;
  const isFailed = message.status === 'failed';
  const isSending = message.status === 'sending';
  const isCallMessage = message.messageType === 'call';

  const formatTime = useCallback((timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { 
        addSuffix: true, 
        locale: tr 
      });
    } catch (error) {
      return '';
    }
  }, []);

  const handleReaction = useCallback((emoji) => {
    if (onReaction && !isOptimistic) {
      onReaction(message.id, emoji);
    }
    setShowReactions(false);
  }, [message.id, onReaction, isOptimistic]);

  const handleCopyMessage = useCallback(() => {
    navigator.clipboard.writeText(message.content);
    setShowActions(false);
  }, [message.content]);

  const handleRetry = useCallback(() => {
    if (onRetry && isFailed) {
      onRetry(message.id);
    }
  }, [message.id, onRetry, isFailed]);

  // Special render for call messages
  if (isCallMessage) {
    const isMissed = message.metadata?.isMissed;
    const callDuration = message.metadata?.callDuration || 0;
    const mins = Math.floor(callDuration / 60);
    const secs = callDuration % 60;
    
    return (
      <div className="px-4 py-3">
        <div className="flex items-center space-x-3 text-sm">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isMissed ? 'bg-red-500/20' : 'bg-green-500/20'
          }`}>
            {isMissed ? (
              <PhoneMissed className="w-4 h-4 text-red-400" />
            ) : (
              <Phone className="w-4 h-4 text-green-400" />
            )}
          </div>
          <div className="flex-1">
            <p className={`font-medium ${isMissed ? 'text-red-400' : 'text-green-400'}`}>
              {isMissed ? (
                <>
                  <span className="font-bold">{message.author?.displayName || message.author?.username}</span>
                  {' '}kullanıcısından gelen cevapsız arama
                </>
              ) : (
                <>
                  <span className="font-bold">{message.author?.displayName || message.author?.username}</span>
                  {' '}ile {mins} dakika {secs} saniye süren bir arama başlattı
                </>
              )}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {formatTime(message.timestamp || message.createdAt)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`group relative px-4 py-2 hover:bg-gray-800/30 transition-colors ${
        compact ? 'py-1' : 'py-2'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start space-x-3">
        {/* Avatar */}
        {showAvatar && !compact && (
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {message.author?.displayName?.charAt(0) || 
                 message.author?.username?.charAt(0) || 'U'}
              </span>
            </div>
          </div>
        )}

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          {!compact && (
            <div className="flex items-baseline space-x-2 mb-1">
              <span className="text-white font-medium text-sm">
                {message.author?.displayName || message.author?.username || 'Unknown User'}
              </span>
              <span className="text-gray-500 text-xs">
                {formatTime(message.timestamp)}
              </span>
              {isFailed && (
                <span className="text-red-400 text-xs">başarısız</span>
              )}
            </div>
          )}

          {/* Reply Reference */}
          {message.replyTo && (
            <div className="mb-2 pl-2 border-l-2 border-gray-600">
              <div className="text-gray-400 text-xs">
                <span className="text-gray-300">
                  {message.replyTo.author?.displayName || message.replyTo.author?.username}
                </span>
                <span className="ml-1 truncate">
                  {message.replyTo.content}
                </span>
              </div>
            </div>
          )}

          {/* Message Text */}
          <div className={`text-sm leading-relaxed ${
            isFailed ? 'text-red-300' : 'text-gray-200'
          }`}>
            {message.content}
            {isFailed && (
              <span className="ml-2 text-xs text-red-500">❌</span>
            )}
          </div>

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((attachment, index) => (
                <div key={index} className="bg-gray-800 rounded-lg p-3 max-w-md">
                  {attachment.type?.startsWith('image/') ? (
                    <img 
                      src={attachment.url} 
                      alt={attachment.name}
                      className="max-w-full h-auto rounded"
                    />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gray-700 rounded flex items-center justify-center">
                        📎
                      </div>
                      <div>
                        <div className="text-blue-400 text-sm">{attachment.name}</div>
                        <div className="text-gray-500 text-xs">
                          {(attachment.size / 1024 / 1024).toFixed(1)} MB
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {message.reactions.map((reaction, index) => (
                <button
                  key={index}
                  onClick={() => handleReaction(reaction.emoji)}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-colors ${
                    reaction.users.includes(currentUser?.id)
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <span>{reaction.emoji}</span>
                  <span>{reaction.users.length}</span>
                </button>
              ))}
            </div>
          )}

          {/* Error Message */}
          {isFailed && message.error && (
            <div className="mt-2 flex items-center space-x-2 text-red-400 text-xs">
              <AlertCircle className="w-3 h-3" />
              <span>{message.error}</span>
              <button
                onClick={handleRetry}
                className="text-red-300 hover:text-red-200 underline"
              >
                Tekrar dene
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && !isOptimistic && (
          <div className="flex items-center space-x-1 bg-gray-800 rounded-lg px-2 py-1">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              title="Tepki ekle"
            >
              😊
            </button>
            
            {onReply && (
              <button
                onClick={() => onReply(message)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
                title="Yanıtla"
              >
                <Reply className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleCopyMessage}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              title="Kopyala"
            >
              <Copy className="w-4 h-4" />
            </button>

            {isOwn && onEdit && (
              <button
                onClick={() => onEdit(message)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
                title="Düzenle"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            {isOwn && onDelete && (
              <button
                onClick={() => onDelete(message.id)}
                className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                title="Sil"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button className="p-1 text-gray-400 hover:text-white transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Retry Button for Failed Messages */}
        {isFailed && (
          <button
            onClick={handleRetry}
            className="flex-shrink-0 p-1 text-red-400 hover:text-red-300 transition-colors"
            title="Tekrar gönder"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Reaction Picker */}
      {showReactions && (
        <div className="absolute top-0 right-16 bg-gray-800 border border-gray-700 rounded-lg p-2 shadow-lg z-10">
          <div className="flex space-x-1">
            {Object.values(MESSAGE_REACTIONS).map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="p-2 hover:bg-gray-700 rounded transition-colors text-lg"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageItem;
