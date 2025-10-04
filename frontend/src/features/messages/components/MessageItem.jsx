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
    const isRejected = message.metadata?.isRejected;
    const isMissed = message.metadata?.isMissed;
    
    return (
      <div className="px-4 py-2 my-2">
        <div className="flex items-center space-x-3 bg-gray-800/40 rounded-lg p-3 border border-gray-700/50">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isRejected || isMissed ? 'bg-red-500/20' : 'bg-green-500/20'
          }`}>
            {isRejected || isMissed ? (
              <PhoneMissed className="w-5 h-5 text-red-400" />
            ) : (
              <Phone className="w-5 h-5 text-green-400" />
            )}
          </div>
          <div className="flex-1">
            <p className={`text-sm font-medium ${
              isRejected || isMissed ? 'text-red-400' : 'text-green-400'
            }`}>
              {message.content}
            </p>
            <p className="text-xs text-gray-500 mt-1">
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
        {/* Avatar or Spacer */}
        {showAvatar ? (
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {message.author?.displayName?.charAt(0) || 
                 message.author?.username?.charAt(0) || 'U'}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex-shrink-0 w-10" />
        )}

        {/* Message Content */}
        <div className="flex-1 min-w-0 relative">
          {/* Compact mode timestamp on hover */}
          {compact && (
            <span className="absolute left-0 top-0 text-gray-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity -ml-16">
              {new Date(message.timestamp || message.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          
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
            {/* Render GIF if message is a GIF URL */}
            {message.content.match(/^https?:\/\/.*\.(gif|tenor\.com)/) ? (
              <img 
                src={message.content} 
                alt="GIF" 
                className="max-w-md max-h-80 rounded-lg"
              />
            ) : (
              // Render text with Pepe emoji support
              (() => {
                const pepePattern = /:(\w+):/g;
                const parts = [];
                let lastIndex = 0;
                let match;
                
                while ((match = pepePattern.exec(message.content)) !== null) {
                  if (match.index > lastIndex) {
                    parts.push(message.content.substring(lastIndex, match.index));
                  }
                  
                  const pepeId = match[1];
                  // Complete Pepe map - all 94 emojis
                  const pepeMap = {
                    'pepe_king': '/pepe/11998-pepe-king.png',
                    'pepe_rapper': '/pepe/13328-rapper.png',
                    'pepe_smoke': '/pepe/136857-pepesmoke.gif',
                    'pepe_tricycle': '/pepe/13703-pepe-tricycle.gif',
                    'pepe_cuddle': '/pepe/13796-cuddle.png',
                    'pepe_laugh': '/pepe/1502_pepelaugh.gif',
                    'pepe_yamero': '/pepe/15891-yamero.png',
                    'pepe_cheer': '/pepe/18075-pepe-cheer.gif',
                    'pepe_rockstar': '/pepe/18075-pepe-rockstar.gif',
                    'pepe_shine': '/pepe/18113-pepeshine.gif',
                    'pepe_closedeyes': '/pepe/20497-pepe-closedeyes.png',
                    'pepe_spit': '/pepe/21151-pepe-spit.gif',
                    'pepe_driver': '/pepe/2205_pepegadriver.gif',
                    'pepe_5head': '/pepe/2246_pepe_5head.gif',
                    'pepe_steamdeck': '/pepe/22859-steamdeck.png',
                    'pepe_vanish': '/pepe/24561-pepe-vanish.gif',
                    'pepe_bellyache': '/pepe/24714-pepe-bellyache.gif',
                    'pepe_mcbed': '/pepe/26866-pepemcbed.gif',
                    'pepe_dogehug': '/pepe/26924-dogehug.gif',
                    'pepe_panic': '/pepe/2749-pepe-panic.png',
                    'pepe_doctor': '/pepe/276883-doctor-pepe.gif',
                    'pepe_pray': '/pepe/31261-pray.png',
                    'pepe_thinking': '/pepe/32226-pepethinking.png',
                    'pepe_lmfao': '/pepe/32868-pepe-lmfaoooo.gif',
                    'pepe_blushy': '/pepe/3439-pepe-blushy.png',
                    'pepe_monster': '/pepe/345529-pepemonster.png',
                    'pepe_sadsausage': '/pepe/347770-pepe-sadsausage.png',
                    'pepe_jetski': '/pepe/35745-pepejetski.gif',
                    'pepe_thumbsup': '/pepe/3812_pepe_thumbsup.gif',
                    'pepe_pet': '/pepe/398460-pepepet.gif',
                    'pepe_gamercry': '/pepe/411644-gamer-pepe-cry.gif',
                    'pepe_pixel': '/pepe/41261-pixelpepe.gif',
                    'pepe_stare': '/pepe/41744-stare.png',
                    'pepe_minecraft': '/pepe/4192-pepeminecraft.png',
                    'pepe_plug': '/pepe/43235-pepeplug.png',
                    'pepe_disgusted': '/pepe/4506-pepedisgusted.png',
                    'pepe_jam': '/pepe/45997-pepejam.gif',
                    'pepe_cry': '/pepe/471114-pepecry.png',
                    'pepe_joker': '/pepe/48506-joker.png',
                    'pepe_roasted': '/pepe/50320-pepe-roastedpepe.gif',
                    'pepe_chef': '/pepe/50440-pepe-chef.png',
                    'pepe_hart': '/pepe/50724-hart.png',
                    'pepe_daddy': '/pepe/52925-pepedaddy.gif',
                    'pepe_poker': '/pepe/54890-poker.png',
                    'pepe_oops': '/pepe/56432-pepeoops.png',
                    'pepe_clown': '/pepe/56943-clown-alt.png',
                    'pepe_clowntrain': '/pepe/59958-pepeclownblobtrain.gif',
                    'pepe_point': '/pepe/5997-pepe-point.png',
                    'pepe_squadsus': '/pepe/60299-pepe-squad-sus.png',
                    'pepe_sitting': '/pepe/6110-sitting.gif',
                    'pepe_hyperspeed': '/pepe/61444-pepe-hyperspeed.gif',
                    'pepe_wdym': '/pepe/63226-pepewdym.png',
                    'pepe_robber': '/pepe/63618-pepe-robber.gif',
                    'pepe_flowerwilt': '/pepe/647501-pepeflowerwilt.png',
                    'pepe_prayalt': '/pepe/6605-pepe-pray.png',
                    'pepe_sus': '/pepe/6605-sus.png',
                    'pepe_howdy': '/pepe/6662_PepeHowdy.gif',
                    'pepe_binary': '/pepe/67734-binary.gif',
                    'pepe_jam2': '/pepe/67908-pepejam.gif',
                    'pepe_amongusstab': '/pepe/71051-pepeamongusstab.gif',
                    'pepe_ughping': '/pepe/71945-ughping.png',
                    'pepe_comeandgo': '/pepe/727145-pepecomeandxgo.gif',
                    'pepe_knife': '/pepe/727145-pepeknife.png',
                    'pepe_wizz': '/pepe/7361_PepeWiZz.gif',
                    'pepe_chocoface': '/pepe/76030-pepechocoface.png',
                    'pepe_creditcard': '/pepe/761219-pepe-credit-card.gif',
                    'pepe_bdayparty': '/pepe/77653-pepe-bdayparty.png',
                    'pepe_toasterbath': '/pepe/77885-pepetoasterbathtub.png',
                    'pepe_santarun': '/pepe/8056_Pepe_SantaRun.gif',
                    'pepe_crygif': '/pepe/8321_pepecry.gif',
                    'pepe_thumbsdown': '/pepe/8436_pepe_thumbsdown.gif',
                    'pepe_madpuke': '/pepe/84899-pepe-madpuke.gif',
                    'pepe_boba': '/pepe/89315-boba.png',
                    'pepe_clink': '/pepe/8932-pepeclink.png',
                    'pepe_susalt': '/pepe/90423-pepe-sus.png',
                    'pepe_bedjump': '/pepe/93659-pepebedjump.gif',
                    'pepe_moneyrain': '/pepe/93659-pepemoneyrain.gif',
                    'pepe_lol': '/pepe/94770-pepelol.png',
                    'pepe_gg': '/pepe/95932-pepegg.png',
                    'pepe_toilet': '/pepe/96012-pepe-toilet.gif',
                    'pepe_jam3': '/pepe/9812-pepejam2.gif',
                    'pepe_loving': '/pepe/98260-pepe-loving.gif',
                    'pepe_knifealt': '/pepe/99281-pepe-knife.png',
                    'pepe_sadge': '/pepe/99281-pepe-sadge.png',
                    'pepe_hmm': '/pepe/PepeHmm.gif',
                    'pepe_rain': '/pepe/PepeRain.gif',
                    'pepe_sip': '/pepe/PepeSip.gif',
                  };
                  const pepeUrl = pepeMap[pepeId];
                  
                  if (pepeUrl) {
                    parts.push(
                      <img 
                        key={`pepe-${match.index}`}
                        src={pepeUrl} 
                        alt={pepeId}
                        className="inline-block w-10 h-10 mx-1 align-middle"
                      />
                    );
                  } else {
                    parts.push(match[0]);
                  }
                  
                  lastIndex = match.index + match[0].length;
                }
                
                if (lastIndex < message.content.length) {
                  parts.push(message.content.substring(lastIndex));
                }
                
                return parts.length > 0 ? parts : message.content;
              })()
            )}
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
