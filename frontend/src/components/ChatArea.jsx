import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Hash, Users, Send, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import ContextMenu from "./ContextMenu";
import FileUploadArea from "./FileUploadArea";
import { UserProfileModal } from "./UserProfileModal";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import { useChannelMessages } from "../hooks/useChannelMessages";
import socketService from "../services/socket";
import { messageAPI, roleAPI } from "../services/api";
import { toast } from "sonner";

const ChatArea = ({ channel, server, showMemberList, onToggleMemberList, voiceChannelClicks }) => {
  const { user } = useAuth();
  const { joinChannel, leaveChannel } = useSocket();
  const [roles, setRoles] = useState([]);
  
  // Use new Discord-style messages hook
  const { 
    messages, 
    loading, 
    error: messagesError,
    typingUsers, 
    sendMessage: sendChannelMessage 
  } = useChannelMessages(
    channel?._id, 
    server?._id, 
    server?.members || []
  );
  
  const [message, setMessage] = useState("");
  const [contextMenu, setContextMenu] = useState(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberActionDialog, setMemberActionDialog] = useState({ open: false, action: '', member: null });
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const serverMembersCache = useRef(null);

  // Load roles for the server
  useEffect(() => {
    const loadRoles = async () => {
      if (server?._id || server?.id) {
        try {
          const response = await roleAPI.getRoles(server._id || server.id);
          setRoles(response.data || []);
        } catch (error) {
          console.error('Failed to load roles:', error);
        }
      }
    };
    loadRoles();
  }, [server]);

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

  // Join/leave channel on mount/unmount
  useEffect(() => {
    if (channel?._id && joinChannel) {
      joinChannel(channel._id);
    }
    
    return () => {
      if (channel?._id && leaveChannel) {
        leaveChannel(channel._id);
      }
    };
  }, [channel, joinChannel, leaveChannel]);

  // Handle typing indicator
  const handleTyping = useCallback((value) => {
    if (!channel?._id || !user) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing indicator via socket
    if (value.trim()) {
      // Emit typing event
      if (socketService.socket) {
        socketService.socket.emit('typing', {
          channelId: channel._id,
          isTyping: true
        });
      }
      
      // Stop typing after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        if (socketService.socket) {
          socketService.socket.emit('typing', {
            channelId: channel._id,
            isTyping: false
          });
        }
      }, 3000);
    } else {
      // Stop typing immediately if input is empty
      if (socketService.socket) {
        socketService.socket.emit('typing', {
          channelId: channel._id,
          isTyping: false
        });
      }
    }
  }, [channel, user]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || !channel?._id || !user) return;

    const messageToSend = message.trim();
    
    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (socketService.socket) {
      socketService.socket.emit('typing', {
        channelId: channel._id,
        isTyping: false
      });
    }
    
    // Clear input IMMEDIATELY
    setMessage("");

    // Send via new hook (handles optimistic update automatically)
    await sendChannelMessage(messageToSend, user);
  }, [message, channel, user, sendChannelMessage]);

  const handleReaction = async (messageId, emoji) => {
    try {
      if (channel?._id) {
        await messageAPI.addReaction(messageId, emoji);
        // Reaction update will come via socket
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
    // TODO: Implement file upload with new hook
    toast.info('Dosya yükleme özelliği yakında eklenecek');
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

  const handleInputChange = useCallback((e) => {
    const newValue = e.target.value;
    setMessage(newValue);
    handleTyping(newValue);
  }, [handleTyping]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

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
          {/* Loading State */}
          {loading && messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-400">Mesajlar yükleniyor...</div>
            </div>
          )}
          
          {/* Error State */}
          {messagesError && messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-red-400">Mesajlar yüklenemedi: {messagesError}</div>
            </div>
          )}
          
          {/* Messages */}
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

              // System messages always show avatar and break grouping
              const isSystemMessage = msg.type === 'system' || msg.isSystemMessage;
              const prevIsSystemMessage = prevMessage?.type === 'system' || prevMessage?.isSystemMessage;

              const showAvatar = !prevMessage ||
                isSystemMessage ||
                prevIsSystemMessage ||
                prevUserId !== currentUserId ||
                (prevDate && currentDate && (currentDate - prevDate) > 300000); // 5 minutes

              // Check if this message is grouped (same user, within time limit, not system messages)
              const isGrouped = prevMessage && 
                !isSystemMessage &&
                !prevIsSystemMessage &&
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
                                              
                                              // Use cached members or server.members
                                              let members = serverMembersCache.current || server?.members;
                                              
                                              if (!members) {
                                                // Fallback: fetch from API
                                                try {
                                                  const response = await messageAPI.getServerMembers(serverId);
                                                  members = response.data.members || response.data;
                                                  serverMembersCache.current = members;
                                                } catch (err) {
                                                  toast.error('Üye listesi alınamadı');
                                                  return;
                                                }
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
                        {msg.author.avatar && (
                          <AvatarImage src={msg.author.avatar} alt={msg.author.displayName || msg.author.username} />
                        )}
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {msg.author.username?.charAt(0)?.toUpperCase() || '?'}
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
                            {msg.author ? (msg.author.displayName || msg.author.username) : 'Unknown User'}
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
          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="px-4 pb-2">
              <span className="text-sm text-gray-400">
                {typingUsers.length === 1 
                  ? `${typingUsers[0]} yazıyor...`
                  : typingUsers.length === 2
                  ? `${typingUsers[0]} ve ${typingUsers[1]} yazıyor...`
                  : `${typingUsers.length} kişi yazıyor...`
                }
              </span>
            </div>
          )}
          
          <div className="relative">
            <div className="flex items-center space-x-3 bg-black/50 backdrop-blur-md border border-white/30 rounded-xl p-4">
              <Input
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
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
          server={server}
          roles={roles}
          showMessageButton={true}
          showFriendButton={true}
        />
      )}
    </div>
  );
};

export default React.memo(ChatArea);