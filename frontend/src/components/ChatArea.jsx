import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Hash, Users, Send, Smile, Paperclip, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import ContextMenu from "./ContextMenu";
import FileUploadArea from "./FileUploadArea";
import { UserProfileModal } from "./UserProfileModal";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import { devLog } from "../utils/devLogger";
import { messageAPI } from "../services/api";
import socketService from "../services/socket";
import { toast } from "sonner";

const ChatArea = ({ channel, server, showMemberList, onToggleMemberList, voiceChannelClicks }) => {
  const { user } = useAuth();
  const { sendMessage, on, joinChannel, leaveChannel, isAuthenticated } = useSocket();
  
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [userDisplayNames, setUserDisplayNames] = useState(new Map()); // username -> displayName mapping
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberActionDialog, setMemberActionDialog] = useState({ open: false, action: '', member: null });
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const serverMembersCache = useRef(null); // Cache server members for faster profile opening
  
  // Refs to avoid dependency issues
  const channelRef = useRef(channel);
  const serverRef = useRef(server);
  const userRef = useRef(user);
  const sendMessageRef = useRef(sendMessage);
  
  // Update refs when values change
  useEffect(() => {
    channelRef.current = channel;
    serverRef.current = server;
    userRef.current = user;
    sendMessageRef.current = sendMessage;
  }, [channel, server, user, sendMessage]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Simple scroll after messages change
  useLayoutEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
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
        joinChannel(channel._id);
      }
    };

    // Listen for authentication
    const unsubscribeAuth = on('authenticated', handleAuthenticated);

    // If already authenticated, join immediately (but only once)
    if (channel?._id && joinChannel && isAuthenticated()) {
      joinChannel(channel._id);
    }

    const unsubscribeNewMessage = on('newMessage', (newMessage) => {
      // Handle system messages first
      if (newMessage.type === 'system' || newMessage.isSystemMessage) {
        newMessage.isSystemMessage = true;
        newMessage.systemMessageType = newMessage.systemMessageType || 'member_join';
      }
      
      // Only add message if it belongs to the current channel OR it's a system message
      if (newMessage.channel === channel?._id || newMessage.type === 'system' || newMessage.isSystemMessage) {
        
        // Fix displayName using our mapping
        if (newMessage.author && newMessage.author.username) {
          const correctDisplayName = userDisplayNames.get(newMessage.author.username);
          if (correctDisplayName) {
            newMessage.author.displayName = correctDisplayName;
          } else if (!newMessage.author.displayName) {
            newMessage.author.displayName = newMessage.author.username;
          }
        }
        
        // Optimized duplicate check with Map for O(1) lookup
        setMessages(prev => {
          const messageMap = new Map(prev.map(msg => [msg._id, msg]));
          if (messageMap.has(newMessage._id)) {
            return prev;
          }
          
          // Remove optimistic message with same content (within 5 seconds)
          const filtered = prev.filter(msg => {
            if (!msg.isOptimistic) return true;
            
            // Check if this is the same message (same content and recent)
            const timeDiff = Math.abs(new Date(newMessage.createdAt) - new Date(msg.createdAt));
            const isSameContent = msg.content === newMessage.content;
            const isRecent = timeDiff < 5000; // 5 seconds
            
            // Keep the message if it's not a match
            return !(isSameContent && isRecent);
          });
          
          return [...filtered, newMessage];
        });
      }
    });

    const unsubscribeError = on('error', (error) => {
      console.error('Socket error:', error);
      toast.error(error.message || 'Mesaj gönderilemedi');
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
      unsubscribeError();
      unsubscribeTyping();
      unsubscribeReaction();
    };
  }, [channel, user, on, joinChannel, leaveChannel, userDisplayNames]);

  const loadMessages = async () => {
    if (!channel?._id) return;

    try {
      setLoading(true);

      const response = await messageAPI.getMessages(channel._id, 1, 50);
      const newMessages = response.data.messages || [];

      // Process messages - handle system messages
      newMessages.forEach(message => {
        if (message.type === 'system' || message.isSystemMessage) {
          message.isSystemMessage = true;
          message.systemMessageType = message.systemMessageType || 'member_join';
        }
      });

      // Update displayName mapping from loaded messages
      const newDisplayNames = new Map();
      newMessages.forEach(message => {
        if (message.author && message.author.username && message.author.displayName) {
          // Only use displayName if it's different from username (means it's been set properly)
          if (message.author.displayName !== message.author.username) {
            newDisplayNames.set(message.author.username, message.author.displayName);
          }
        }
      });
      
      // Update the mapping
      setUserDisplayNames(prev => {
        const updated = new Map(prev);
        newDisplayNames.forEach((displayName, username) => {
          updated.set(username, displayName);
        });
        return updated;
      });

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

  // Handle typing indicator
  const handleTyping = useCallback((value) => {
    if (!channelRef.current?._id || !userRef.current) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing indicator via socket
    if (value.trim()) {
      // Emit typing event
      if (socketService.socket) {
        socketService.socket.emit('typing', {
          channelId: channelRef.current._id,
          isTyping: true
        });
      }
      
      // Stop typing after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        if (socketService.socket) {
          socketService.socket.emit('typing', {
            channelId: channelRef.current._id,
            isTyping: false
          });
        }
      }, 3000);
    } else {
      // Stop typing immediately if input is empty
      if (socketService.socket) {
        socketService.socket.emit('typing', {
          channelId: channelRef.current._id,
          isTyping: false
        });
      }
    }
  }, []);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || !channelRef.current) return;

    const messageToSend = message.trim();
    const currentChannelId = channelRef.current._id;
    
    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (socketService.socket) {
      socketService.socket.emit('typing', {
        channelId: currentChannelId,
        isTyping: false
      });
    }
    
    // Clear input IMMEDIATELY for instant feedback (optimistic UI)
    setMessage("");

    // Create optimistic message
    const optimisticMessage = {
      _id: `optimistic_${Date.now()}_${Math.random()}`,
      id: `optimistic_${Date.now()}_${Math.random()}`,
      author: userRef.current || {
        id: 'unknown',
        username: 'Unknown User',
        displayName: 'Unknown User',
        avatar: '',
        roleColor: '#6b7280'
      },
      content: messageToSend,
      createdAt: new Date(),
      timestamp: new Date(),
      channel: currentChannelId,
      reactions: [],
      isOptimistic: true,
      status: 'sending'
    };

    // Add optimistic message IMMEDIATELY
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      if (currentChannelId) {
        // Send via WebSocket with error handling
        await sendMessageRef.current(currentChannelId, messageToSend, serverRef.current?._id);
        
        // Mark optimistic message as sent (will be replaced by real message from socket)
        setMessages(prev => 
          prev.map(msg => 
            msg._id === optimisticMessage._id 
              ? { ...msg, status: 'sent' }
              : msg
          )
        );
      } else {
        // Fallback for mock data - already added optimistically
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Mark optimistic message as failed
      setMessages(prev => 
        prev.map(msg => 
          msg._id === optimisticMessage._id 
            ? { ...msg, status: 'failed', error: error.message }
            : msg
        )
      );
      
      // Restore message on error
      setMessage(messageToSend);
      toast.error('Mesaj gönderilemedi. Tekrar deneyin.');
    }
  }, [message]);

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
    <div className="flex-1 flex flex-col h-full bg-black/20 backdrop-blur-sm">
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
        <div 
          key={channel._id}
          ref={(el) => {
            messagesContainerRef.current = el;
            if (el) {
              // Immediately scroll to bottom when ref is set
              el.scrollTop = el.scrollHeight;
            }
          }}
          className="flex-1 overflow-y-auto p-4" 
          style={{ maxHeight: 'calc(100vh - 200px)', scrollBehavior: 'auto' }}
        >
          <div className="w-full space-y-2">
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

              // Use correct ID field (could be _id from MongoDB)
              const getCurrentUserId = (author) => author?.id || author?._id;
              const currentUserId = getCurrentUserId(msg.author);
              const prevUserId = prevMessage ? getCurrentUserId(prevMessage.author) : null;

              const showAvatar = !prevMessage ||
                prevUserId !== currentUserId ||
                (prevDate && currentDate && (currentDate - prevDate) > 300000); // 5 minutes

              // Check if this message is grouped (same user, within time limit)
              const isGrouped = prevMessage && 
                prevUserId === currentUserId && 
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
                  
                  {/* System Message - Discord Style */}
                  {msg.isSystemMessage ? (
                    <div className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            msg.systemMessageType === 'member_join' ? 'bg-green-500/20' :
                            msg.systemMessageType === 'member_leave' ? 'bg-red-500/20' :
                            msg.systemMessageType === 'server_boost' ? 'bg-purple-500/20' :
                            'bg-blue-500/20'
                          }`}>
                            {msg.systemMessageType === 'member_join' && (
                              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                              </svg>
                            )}
                            {msg.systemMessageType === 'member_leave' && (
                              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                              </svg>
                            )}
                            {msg.systemMessageType === 'server_boost' && (
                              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            )}
                            {msg.systemMessageType === 'channel_created' && (
                              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm">
                            <span className={`font-medium ${
                              msg.systemMessageType === 'member_join' ? 'text-green-400' :
                              msg.systemMessageType === 'member_leave' ? 'text-red-400' :
                              msg.systemMessageType === 'server_boost' ? 'text-purple-400' :
                              'text-blue-400'
                            }`}>
                              {(() => {
                                // Parse message content to make username clickable
                                const match = msg.content.match(/\*\*(.*?)\*\*/);
                                if (match) {
                                  const username = match[1];
                                  const parts = msg.content.split(/\*\*.*?\*\*/);
                                  return (
                                    <>
                                      {parts[0]}
                                      <button
                                        onClick={async () => {
                                          if (msg.author) {
                                            setSelectedMember(msg.author);
                                            setMemberActionDialog({ open: true, action: 'view', member: msg.author });
                                          } else {
                                            // If author is null, try to find user from server members by username
                                            try {
                                              const serverId = server?._id || channel?.server;
                                              if (!serverId) {
                                                toast.error('Server bilgisi bulunamadı');
                                                return;
                                              }
                                              
                                              // Use cached members if available
                                              let members;
                                              if (serverMembersCache.current) {
                                                members = serverMembersCache.current;
                                              } else {
                                                const response = await fetch(`http://localhost:5000/api/servers/${serverId}/members`, {
                                                  headers: {
                                                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                                                  }
                                                });
                                                const data = await response.json();
                                                members = data.members || data;
                                                serverMembersCache.current = members; // Cache for next time
                                              }
                                              
                                              const member = members?.find(m => 
                                                m.username === username || m.displayName === username
                                              );
                                              
                                              if (member) {
                                                const userData = {
                                                  _id: member.id,
                                                  username: member.username,
                                                  displayName: member.displayName,
                                                  avatar: member.avatar,
                                                  status: member.status
                                                };
                                                setSelectedMember(userData);
                                                setMemberActionDialog({ open: true, action: 'view', member: userData });
                                              } else {
                                                toast.info('Kullanıcı bilgisi bulunamadı');
                                              }
                                            } catch (error) {
                                              toast.error('Kullanıcı bilgisi alınamadı');
                                            }
                                          }
                                        }}
                                        className="font-bold text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer transition-colors"
                                      >
                                        {username}
                                      </button>
                                      {parts[1]}
                                    </>
                                  );
                                }
                                return msg.content;
                              })()}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {formatTime(msg.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Regular Message */
                    msg.author && (
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
                            {(() => {
                              // Use mapping for correct displayName, fallback to author.displayName, then username
                              const correctDisplayName = userDisplayNames.get(msg.author.username);
                              const displayName = correctDisplayName || msg.author.displayName || msg.author.username;
                              return displayName;
                            })()}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                      )}
                      
                      <div className={`text-base leading-relaxed ${
                        msg.isOptimistic && msg.status === 'failed' 
                          ? 'text-red-400' 
                          : 'text-gray-200'
                      }`}>
                        {msg.content}
                        {msg.isOptimistic && msg.status === 'failed' && (
                          <span className="ml-2 text-xs text-red-500">❌ Gönderilemedi</span>
                        )}
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
                    )
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Message Input - Only show for text channels */}
      {channel?.type === "text" && (
        <div className="p-4 bg-black/20 backdrop-blur-sm border-t border-white/10">
          <div className="relative">
            <div className="flex items-center space-x-3 bg-black/50 backdrop-blur-md border border-white/30 rounded-xl p-4">
              <Input
                value={message}
                onChange={useCallback((e) => {
                  const newValue = e.target.value;
                  setMessage(newValue);
                  handleTyping(newValue);
                }, [handleTyping])}
                onKeyDown={useCallback((e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }, [handleSendMessage])}
                placeholder={`#${channel?.name || 'kanal'} kanalına mesaj`}
                className="flex-1 bg-transparent border-none text-white placeholder-gray-400 focus:ring-0 focus:outline-none text-base"
                autoFocus
              />
              
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim()}
                size="icon"
                className="w-9 h-9 bg-blue-600 hover:bg-blue-700 hover:scale-110 disabled:opacity-50 disabled:hover:bg-blue-600 disabled:hover:scale-100 transition-all duration-200"
                title="Gönder (Enter)"
              >
                <Send className="w-5 h-5" />
              </Button>
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

      {/* User Profile Modal */}
      {memberActionDialog.open && memberActionDialog.member && (
        <UserProfileModal
          open={memberActionDialog.open}
          onOpenChange={(open) => {
            if (!open) {
              setMemberActionDialog({ open: false, action: '', member: null });
              setSelectedMember(null);
            }
          }}
          user={memberActionDialog.member}
          currentUser={user}
          showMessageButton={true}
          showFriendButton={true}
        />
      )}
    </div>
  );
};

export default React.memo(ChatArea);