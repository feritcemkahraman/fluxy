import React, { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Hash, Users, Send, Smile, Paperclip, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import ContextMenu from "./ContextMenu";
import FileUploadArea from "./FileUploadArea";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import { devLog } from "../utils/devLogger";
import { messageAPI } from "../services/api";
import socketService from "../services/socket";
import { toast } from "sonner";

const ChatArea = ({ channel, server, showMemberList, onToggleMemberList, voiceChannelClicks }) => {
  const { user } = useAuth();
  const { sendMessage, on, joinChannel, leaveChannel } = useSocket();
  
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load messages when channel changes
  useEffect(() => {
    if (channel && channel._id) {
      // Clear messages when channel changes to prevent cross-channel duplication
      setMessages([]);
      setTypingUsers([]);
      loadMessages();
    } else {
      // No fallback - show empty state
      setMessages([]);
      setTypingUsers([]);
    }
  }, [channel]);

  // Debug: Log messages when they change (temporary)
  useEffect(() => {
    // Development logging removed for cleaner console
  }, [messages, channel]);

  // Socket event listeners
  useEffect(() => {
    // Wait for socket authentication before joining channel
    const handleAuthenticated = () => {
      if (channel?._id && joinChannel) {
        devLog.log('Socket authenticated, joining channel:', channel._id);
        joinChannel(channel._id);
      }
    };

    // Listen for authentication
    const unsubscribeAuth = on('authenticated', handleAuthenticated);

    // If already authenticated, join immediately
    if (channel?._id && joinChannel && socketService.isAuthenticated) {
      devLog.log('Socket already authenticated, joining channel:', channel._id);
      joinChannel(channel._id);
    }

    const unsubscribeNewMessage = on('newMessage', (newMessage) => {
      // Only add message if it belongs to the current channel
      if (newMessage.channel === channel?._id) {
        // Prevent duplicate messages by checking if message already exists
        setMessages(prev => {
          const messageExists = prev.some(msg => msg._id === newMessage._id || msg.id === newMessage.id);
          if (messageExists) {
            return prev;
          }
          
          return [...prev, newMessage];
        });
      }
    });

    const unsubscribeTyping = on('userTyping', (data) => {
      // Only process typing for current channel
      if (data.channelId === channel?._id && data.userId !== user?._id) {
        if (data.isTyping) {
          setTypingUsers(prev => {
            if (!prev.includes(data.username)) {
              return [...prev, data.username];
            }
            return prev;
          });
        } else {
          setTypingUsers(prev => prev.filter(username => username !== data.username));
        }
      }
    });

    const unsubscribeReaction = on('reactionUpdate', (data) => {
      // Only process reactions for current channel
      if (data.channelId === channel?._id) {
        setMessages(prev => prev.map(msg => 
          msg._id === data.messageId ? { ...msg, reactions: data.reactions } : msg
        ));
      }
    });

    // Cleanup: leave channel when component unmounts or channel changes
    return () => {
      if (channel?._id && leaveChannel) {
        leaveChannel(channel._id);
      }
      unsubscribeAuth();
      unsubscribeNewMessage();
      unsubscribeTyping();
      unsubscribeReaction();
    };
  }, [channel, user, on, joinChannel, leaveChannel]);

  const loadMessages = async () => {
    if (!channel?._id) return;

    try {
      setLoading(true);

      const response = await messageAPI.getMessages(channel._id, 1, 50);
      const newMessages = response.data.messages || [];


      // Prevent duplicates when loading messages and ensure they belong to current channel
      setMessages(prev => {
        // Only keep messages that belong to the current channel
        const currentChannelMessages = prev.filter(msg => msg.channel === channel._id);
        
        const existingIds = new Set(currentChannelMessages.map(msg => msg._id || msg.id));
        const uniqueNewMessages = newMessages.filter(msg => 
          !existingIds.has(msg._id || msg.id) && msg.channel === channel._id
        );

        if (uniqueNewMessages.length > 0) {
        }


        return [...currentChannelMessages, ...uniqueNewMessages];
      });
    } catch (error) {

      // Show more specific error message
      if (error.code === 'ERR_NETWORK') {
        toast.error('Sunucuya bağlanılamıyor. Backend çalışıyor mu kontrol edin.');
      } else if (error.response?.status === 403) {
        toast.error('Bu kanala erişim izniniz yok.');
      } else if (error.response?.status === 404) {
        toast.error('Kanal bulunamadı.');
      } else {
        toast.error('Mesajlar yüklenirken hata oluştu.');
      }

      // No fallback - show empty state
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !channel) return;

    const messageToSend = message.trim();
    const currentChannelId = channel._id;
    setMessage(""); // Clear input immediately

    try {
      if (currentChannelId) {
        // Optimistic update - add message immediately to state
        const optimisticMessage = {
          _id: `temp-${Date.now()}`, // Temporary ID
          content: messageToSend,
          author: user,
          channel: currentChannelId,
          server: server?._id,
          createdAt: new Date(),
          reactions: []
        };

        // Add optimistic message to UI immediately (only if still on same channel)
        setMessages(prev => {
          // Double-check we're still on the same channel
          if (channel?._id === currentChannelId) {
            return [...prev, optimisticMessage];
          }
          return prev;
        });

        // Send via WebSocket (this will trigger socket broadcast to other users)
        sendMessage(currentChannelId, messageToSend, server?._id);

        // Note: We don't send via API here to avoid duplicates
        // The WebSocket will save to DB and broadcast to all users including us
      } else {
        // Fallback for mock data
        const newMessage = {
          id: `msg${Date.now()}`,
          author: user || {
            id: 'unknown',
            username: 'Unknown User',
            displayName: 'Unknown User',
            avatar: '',
            roleColor: '#6b7280'
          },
          content: messageToSend,
          timestamp: new Date(),
          reactions: []
        };
        setMessages(prev => [...prev, newMessage]);
      }

      // Stop typing indicator
      if (currentChannelId) {
        sendTyping(currentChannelId, server?._id, false);
      }

    } catch (error) {
      toast.error('Mesaj gönderilemedi');
      // Remove optimistic message on error (only if still on same channel)
      setMessages(prev => prev.filter(msg => 
        !(msg._id?.startsWith('temp-') && channel?._id === currentChannelId)
      ));
    }
  };

  const handleTyping = (value) => {
    setMessage(value);
    
    // TODO: Implement typing indicator
    // if (channel?._id) {
    //   // Send typing indicator via WebSocket
    //   sendTyping(channel._id, true);
    //   
    //   // Clear previous timeout
    //   if (typingTimeoutRef.current) {
    //     clearTimeout(typingTimeoutRef.current);
    //   }
    //   
    //   // Stop typing after 3 seconds of inactivity
    //   typingTimeoutRef.current = setTimeout(() => {
    //     sendTyping(channel._id, false);
    //   }, 3000);
    // }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      if (channel._id) {
        await messageAPI.addReaction(messageId, emoji);
        addReaction(messageId, emoji, channel._id);
      }
    } catch (error) {
      toast.error('Tepki eklenemedi');
    }
  };

  const handleRightClick = (event, type, data) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type,
      data
    });
  };

  const handleFileUpload = (files) => {
    // Handle file upload - normally would upload to server
    files.forEach(file => {
      const newMessage = {
        id: `msg${Date.now()}-${Math.random()}`,
        author: user || { id: 'unknown', username: 'Unknown User', avatar: '', roleColor: '#6b7280' },
        content: `📎 ${file.name}`,
        timestamp: new Date(),
        reactions: [],
        file: file
      };
      setMessages(prev => [...prev, newMessage]);
    });
  };

  const formatTime = (timestamp) => {
    try {
      if (!timestamp) return '--:--';
      // Handle both Date objects and ISO strings
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      if (isNaN(date.getTime())) return '--:--';

      return new Intl.DateTimeFormat('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(date);
    } catch (error) {
      return '--:--';
    }
  };

  const formatDate = (timestamp) => {
    try {
      if (!timestamp) return 'Tarih yok';
      // Handle both Date objects and ISO strings
      const messageDate = timestamp instanceof Date ? timestamp : new Date(timestamp);
      if (isNaN(messageDate.getTime())) return 'Geçersiz tarih';

      const today = new Date();

      if (messageDate.toDateString() === today.toDateString()) {
        return "Bugün";
      } else {
        return messageDate.toLocaleDateString('tr-TR');
      }
    } catch (error) {
      return 'Tarih yok';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-black/20 backdrop-blur-sm">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <Hash className="w-5 h-5 text-gray-400" />
          <h3 className="text-white font-semibold">{channel?.name || 'Bir kanal seçin'}</h3>
          <div className="w-px h-4 bg-white/20" />
          <span className="text-sm text-gray-400">
            {channel?.type === "text" ? "Metin Kanalı" : channel?.type === "voice" ? "Ses Kanalı" : "Kanal"}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Mesajlarda ara..."
              className="pl-10 w-64 bg-black/30 border-white/20 text-white placeholder-gray-400 focus:border-blue-500"
            />
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMemberList}
            className={`w-8 h-8 text-gray-400 hover:text-gray-300 hover:bg-white/10 ${
              showMemberList ? "bg-white/10 text-white" : ""
            }`}
          >
            <Users className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Chat Area for Text Channels ONLY */}
      {channel?.type === "text" && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="w-full">
            {messages.map((msg, index) => {
              const prevMessage = index > 0 ? messages[index - 1] : null;

              // Safely handle date comparisons
              const getValidDate = (timestamp) => {
                try {
                  if (!timestamp) return null;
                  // Handle both Date objects and ISO strings
                  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
                  return isNaN(date.getTime()) ? null : date;
                } catch {
                  return null;
                }
              };

              const currentDate = getValidDate(msg.createdAt);
              const prevDate = prevMessage ? getValidDate(prevMessage.createdAt) : null;

              const showDate = !prevDate || !currentDate ||
                currentDate.toDateString() !== prevDate.toDateString();

              const showAvatar = !prevMessage ||
                prevMessage.author.id !== msg.author.id ||
                (prevDate && currentDate && (currentDate - prevDate) > 300000); // 5 minutes

              // Check if this message is grouped (same user, within time limit)
              const isGrouped = prevMessage && 
                prevMessage.author.id === msg.author.id && 
                prevDate && currentDate && 
                (currentDate - prevDate) <= 300000;

              return (
                <div key={msg._id || msg.id} className={isGrouped ? "mt-0.5" : "mt-2"}>
                  {showDate && (
                    <div className="flex items-center justify-center my-4">
                      <div className="bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
                        <span className="text-xs text-gray-400 font-medium">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex space-x-3 group hover:bg-white/5 transition-colors px-3 pt-2 pb-0"
                  onContextMenu={(e) => handleRightClick(e, "message", msg)}
                  >
                    {showAvatar && (
                      <Avatar 
                        className="w-10 h-10 ring-2 ring-white/10 cursor-pointer group-hover:ring-white/20 transition-all"
                        onContextMenu={(e) => handleRightClick(e, "user", msg.author)}
                      >
                        <AvatarImage src={null} alt={msg.author.username} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {msg.author.username.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    {!showAvatar && (
                      <div className="w-10"></div> // Placeholder for alignment
                    )}
                    
                    <div className="flex-1 min-w-0">
                      {showAvatar && (
                        <div className="flex items-baseline space-x-2 mb-1">
                          <span 
                            className="font-semibold text-base text-white"
                          >
                            {msg.author.displayName || msg.author.username}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                      )}
                      
                      <div className="text-gray-200 text-base leading-relaxed">
                        {msg.content}
                      </div>
                      
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {msg.reactions.map((reaction, idx) => (
                            <Button
                              key={`reaction-${msg._id || msg.id}-${idx}`}
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm"
                            >
                              <span className="mr-1">{reaction.emoji}</span>
                              <span className="text-xs text-gray-300">{reaction.count}</span>
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Message Input - Only show for text channels */}
      {channel?.type === "text" && (
        <div className="p-4">
          <div className="relative">
            <div className="flex items-center space-x-3 bg-black/40 backdrop-blur-md border border-white/20 rounded-lg p-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowFileUpload(true)}
                className="w-8 h-8 text-gray-400 hover:text-gray-600"
                style={{ 
                  '--tw-ring-color': 'transparent',
                  '--tw-shadow': 'none',
                  backgroundColor: 'transparent',
                  borderColor: 'transparent'
                }}
              >
                <Paperclip 
                  className="w-4 h-4" 
                  style={{ 
                    color: 'currentColor',
                    fill: 'none',
                    stroke: 'currentColor',
                    strokeWidth: '2'
                  }}
                />
              </Button>
              
              <Input
                value={message}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={`#${channel?.name || 'kanal'} kanalına mesaj`}
                className="flex-1 bg-transparent border-none text-white placeholder-gray-400 focus:ring-0 focus:outline-none"
              />
              
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-8 h-8 text-gray-400 hover:text-gray-600"
                  style={{ 
                    '--tw-ring-color': 'transparent',
                    '--tw-shadow': 'none',
                    backgroundColor: 'transparent',
                    borderColor: 'transparent'
                  }}
                >
                  <Smile 
                    className="w-4 h-4" 
                    style={{ 
                      color: 'currentColor',
                      fill: 'none',
                      stroke: 'currentColor',
                      strokeWidth: '2'
                    }}
                  />
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  size="icon"
                  className="w-8 h-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          type={contextMenu.type}
          data={contextMenu.data}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* File Upload Modal */}
      {showFileUpload && (
        <FileUploadArea
          onFileUpload={handleFileUpload}
          onClose={() => setShowFileUpload(false)}
        />
      )}
    </div>
  );
};

export default ChatArea;