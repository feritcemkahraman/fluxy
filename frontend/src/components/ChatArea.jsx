import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Hash, Users, Send, Search, Smile, Image as ImageIcon, Reply, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import ContextMenu from "./ContextMenu";
import FileUploadArea from "./FileUploadArea";
import { UserProfileModal } from "./UserProfileModal";
import { EmojiGifPicker } from "./EmojiGifPicker";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import { useChannelMessages } from "../hooks/useChannelMessages";
import socketService from "../services/socket";
import { messageAPI, roleAPI } from "../services/api";

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberActionDialog, setMemberActionDialog] = useState({ open: false, action: '', member: null });
  const [replyingTo, setReplyingTo] = useState(null); // Discord-like reply state
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionCursorIndex, setMentionCursorIndex] = useState(0);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const serverMembersCache = useRef(null);

  // Extract server members for mention autocomplete
  const serverMembers = useMemo(() => {
    if (!server?.members) return [];
    return server.members.map(member => ({
      _id: member.user?._id || member.user?.id || member._id,
      id: member.user?._id || member.user?.id || member._id,
      username: member.user?.username || member.username,
      displayName: member.user?.displayName || member.displayName || member.user?.username || member.username,
      avatar: member.user?.avatar || member.avatar
    }));
  }, [server?.members]);

  // Load roles for the server
  useEffect(() => {
    const loadRoles = async () => {
      if (server?._id || server?.id) {
        try {
          const response = await roleAPI.getRoles(server._id || server.id);
          setRoles(response || []);
        } catch (error) {
          console.error('Failed to load roles:', error);
        }
      }
    };
    loadRoles();
  }, [server]);

  // Filtered messages with useMemo (performance optimization)
  const filteredMessages = useMemo(() => {
    if (!searchTerm.trim()) return messages;
    
    const search = searchTerm.toLowerCase();
    return messages.filter(msg => 
      msg.content?.toLowerCase().includes(search) ||
      msg.author?.username?.toLowerCase().includes(search) ||
      msg.author?.displayName?.toLowerCase().includes(search)
    );
  }, [messages, searchTerm]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-scroll to bottom - runs AFTER DOM is updated but BEFORE paint
  useLayoutEffect(() => {
    if (messagesContainerRef.current && messages.length > 0) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Force scroll on channel change after loading completes
  useLayoutEffect(() => {
    if (!loading && messagesContainerRef.current && channel?._id) {
      // Small delay to ensure all DOM updates are complete
      requestAnimationFrame(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      });
    }
  }, [loading, channel?._id]);

  // Helper functions for Discord-like message grouping
  const shouldGroupMessage = useCallback((currentMsg, prevMsg) => {
    if (!prevMsg) return false;
    if (currentMsg.isSystemMessage || prevMsg.isSystemMessage) return false;

    const currentUserId = currentMsg.author?.id || currentMsg.author?._id;
    const prevUserId = prevMsg.author?.id || prevMsg.author?._id;

    if (currentUserId !== prevUserId) return false;

    // Check time difference (5 minutes)
    try {
      const currentTime = new Date(currentMsg.createdAt).getTime();
      const prevTime = new Date(prevMsg.createdAt).getTime();
      return (currentTime - prevTime) <= 300000;
    } catch {
      return false;
    }
  }, []);

  const shouldShowAvatar = useCallback((currentMsg, prevMsg) => {
    return !shouldGroupMessage(currentMsg, prevMsg);
  }, [shouldGroupMessage]);

  const shouldShowDateSeparator = useCallback((currentMsg, prevMsg) => {
    if (!prevMsg) return true;

    try {
      const currentDate = new Date(currentMsg.createdAt);
      const prevDate = new Date(prevMsg.createdAt);
      return currentDate.toDateString() !== prevDate.toDateString();
    } catch {
      return false;
    }
  }, []);

  const formatDate = (timestamp) => {
    try {
      const date = new Date(timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return 'Bugün';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Dün';
      } else {
        return date.toLocaleDateString('tr-TR', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        });
      }
    } catch {
      return '';
    }
  };

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
    
    // Check for :pepe: patterns (for optimistic message display)
    const hasPepe = /:([a-zA-Z0-9_]+):/.test(messageToSend);
    
    // Discord-like optimistic UI - message appears instantly
    if (hasPepe) {
      // TODO: If message contains :pepe: emojis, we might want to handle them specially
    }
    
    // Clear input IMMEDIATELY
    setMessage("");

    // Send via new hook (handles optimistic update automatically)
    // Include reply information if replying
    await sendChannelMessage(messageToSend, user, { 
      replyTo: replyingTo?._id || replyingTo?.id 
    });
    
    // Clear reply state after sending
    setReplyingTo(null);
  }, [message, channel, user, sendChannelMessage, replyingTo]);

  const handleReaction = useCallback(async (messageId, emoji) => {
    try {
      if (channel?._id) {
        await messageAPI.addReaction(messageId, emoji);
      }
    } catch (error) {
      console.error('Reaction error:', error);
    }
  }, [channel?._id]);

  const handleRightClick = useCallback((event, type, data) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      type,
      data
    });
  }, []);

  const handleFileUpload = useCallback((files) => {
    // TODO: Implement file upload with new hook
  }, []);

  const handleReply = useCallback((messageToReply) => {
    setReplyingTo(messageToReply);
  }, []);

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

  const handleInputChange = useCallback((e) => {
    const newMessage = e.target.value;
    setMessage(newMessage);
    
    // Check for mention trigger (@)
    const words = newMessage.split(' ');
    const lastWord = words[words.length - 1];
    
    if (lastWord.startsWith('@') && lastWord.length > 1) {
      const search = lastWord.substring(1);
      setMentionSearch(search);
      setShowMentionAutocomplete(true);
      setMentionCursorIndex(0);
    } else {
      setShowMentionAutocomplete(false);
    }
    handleTyping(newMessage);
  }, [handleTyping]);

  // Filter members for mention autocomplete
  const filteredMentionMembers = useMemo(() => {
    if (!showMentionAutocomplete || !mentionSearch) return [];
    
    const search = mentionSearch.toLowerCase();
    return serverMembers
      .filter(member => 
        member.username?.toLowerCase().includes(search) ||
        member.displayName?.toLowerCase().includes(search)
      )
      .slice(0, 5); // Max 5 suggestions
  }, [showMentionAutocomplete, mentionSearch, serverMembers]);

  const selectMention = useCallback((member) => {
    const words = message.split(' ');
    words[words.length - 1] = `@${member.username} `;
    setMessage(words.join(' '));
    setShowMentionAutocomplete(false);
  }, [message]);

  const handleKeyDown = useCallback((e) => {
    // Mention autocomplete navigation
    if (showMentionAutocomplete && filteredMentionMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionCursorIndex(prev => 
          prev < filteredMentionMembers.length - 1 ? prev + 1 : prev
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionCursorIndex(prev => prev > 0 ? prev - 1 : 0);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectMention(filteredMentionMembers[mentionCursorIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowMentionAutocomplete(false);
        return;
      }
    }
    
    // Normal message send
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage, showMentionAutocomplete, filteredMentionMembers, mentionCursorIndex, selectMention]);

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
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4" 
          style={{ maxHeight: 'calc(100vh - 200px)' }}
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
          
          {/* Messages - Discord-like Rendering */}
          {!loading && messages.length > 0 && (
            <div className="space-y-0">
              {filteredMessages.map((msg, index) => {
                const prevMessage = index > 0 ? filteredMessages[index - 1] : null;
                const showAvatar = shouldShowAvatar(msg, prevMessage);
                const isGrouped = shouldGroupMessage(msg, prevMessage);
                const showDate = shouldShowDateSeparator(msg, prevMessage);

                return (
                  <div key={msg._id || msg.id}>
                    {/* Date Separator */}
                    {showDate && (
                      <div className="flex items-center justify-center my-4">
                        <div className="bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10">
                          <span className="text-xs text-gray-400 font-medium">
                            {formatDate(msg.createdAt)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* System Message */}
                    {msg.isSystemMessage ? (
                      <div className="py-2 px-4">
                        <div className={`relative overflow-hidden rounded-lg border backdrop-blur-sm transition-all hover:scale-[1.01] ${
                          msg.systemMessageType === 'member_join' 
                            ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/15' 
                            : msg.systemMessageType === 'member_leave'
                            ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/15'
                            : 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15'
                        }`}>
                          {/* Decorative gradient bar on left */}
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                            msg.systemMessageType === 'member_join' 
                              ? 'bg-gradient-to-b from-green-400 to-green-600' 
                              : msg.systemMessageType === 'member_leave'
                              ? 'bg-gradient-to-b from-red-400 to-red-600'
                              : 'bg-gradient-to-b from-blue-400 to-blue-600'
                          }`} />
                          
                          <div className="flex items-center space-x-4 py-3 px-4 pl-5">
                            {/* Icon */}
                            <div className="flex-shrink-0">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
                                msg.systemMessageType === 'member_join' 
                                  ? 'bg-gradient-to-br from-green-400 to-green-600' 
                                  : msg.systemMessageType === 'member_leave'
                                  ? 'bg-gradient-to-br from-red-400 to-red-600'
                                  : 'bg-gradient-to-br from-blue-400 to-blue-600'
                              }`}>
                                {msg.systemMessageType === 'member_join' ? (
                                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                  </svg>
                                ) : msg.systemMessageType === 'member_leave' ? (
                                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                  </svg>
                                ) : (
                                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline space-x-2">
                                <span className={`text-sm ${
                                  msg.systemMessageType === 'member_join' 
                                    ? 'text-green-300' 
                                    : msg.systemMessageType === 'member_leave'
                                    ? 'text-red-300'
                                    : 'text-blue-300'
                                }`}>
                                  {(() => {
                                    // Parse message to make username clickable
                                    const content = msg.content || '';
                                    // Use displayName (görünen ad) instead of username
                                    const displayName = msg.author?.displayName || msg.author?.username;
                                    const hasAuthor = msg.author !== null && msg.author !== undefined;
                                    
                                    if ((msg.systemMessageType === 'member_join' || msg.systemMessageType === 'member_leave') && displayName) {
                                      // Remove markdown stars from content: **username** -> username
                                      let cleanContent = content.replace(/\*\*/g, '');
                                      
                                      // Split by display name to insert clickable button
                                      const parts = cleanContent.split(displayName);
                                      
                                      return (
                                        <>
                                          {parts[0]}
                                          <button
                                            onClick={() => {
                                              if (msg.author) {
                                                setMemberActionDialog({ 
                                                  open: true, 
                                                  action: 'view', 
                                                  member: msg.author 
                                                });
                                              }
                                            }}
                                            disabled={!hasAuthor}
                                            className={`inline-flex items-center font-bold transition-all px-1.5 py-0.5 rounded ${
                                              hasAuthor 
                                                ? msg.systemMessageType === 'member_join'
                                                  ? 'hover:underline cursor-pointer hover:text-green-200 hover:bg-green-500/20'
                                                  : 'hover:underline cursor-pointer hover:text-red-200 hover:bg-red-500/20'
                                                : 'cursor-default opacity-80'
                                            }`}
                                          >
                                            {displayName}
                                          </button>
                                          {parts[1] || ''}
                                        </>
                                      );
                                    } else {
                                      // Other system messages or no author - display as is
                                      // Still remove markdown stars
                                      const cleanContent = content.replace(/\*\*/g, '');
                                      return <span className="font-semibold">{cleanContent}</span>;
                                    }
                                  })()}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-xs text-gray-400 font-medium">
                                  {formatTime(msg.createdAt)}
                                </span>
                                <span className="text-xs text-gray-500">•</span>
                                <span className={`text-xs font-medium ${
                                  msg.systemMessageType === 'member_join' 
                                    ? 'text-green-400/70' 
                                    : msg.systemMessageType === 'member_leave'
                                    ? 'text-red-400/70'
                                    : 'text-blue-400/70'
                                }`}>
                                  Sistem Mesajı
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Regular Message */
                      <MessageItem
                        message={msg}
                        currentUser={user}
                        showAvatar={showAvatar}
                        compact={isGrouped}
                        onReply={handleReply}
                        onReaction={handleReaction}
                      />
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      )}

      {/* Message Input - Only show for text channels */}
      {channel?.type === "text" && (
        <div className="p-4 bg-black/20 backdrop-blur-sm border-t border-white/10">
          {/* Reply Bar - Discord Style */}
          {replyingTo && (
            <div className="mb-3 px-4 py-2 bg-white/5 rounded-lg border-l-4 border-blue-500 flex items-center justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <Reply className="w-4 h-4 text-blue-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-400 mb-0.5">
                    Replying to <span className="text-blue-400 font-semibold">
                      {replyingTo.author?.displayName || replyingTo.author?.username}
                    </span>
                  </div>
                  <div className="text-sm text-gray-300 truncate">
                    {replyingTo.content}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setReplyingTo(null)}
                className="w-8 h-8 text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          
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
            {/* Mention Autocomplete Dropdown */}
            {showMentionAutocomplete && filteredMentionMembers.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
                {filteredMentionMembers.map((member, index) => (
                  <div
                    key={member._id || member.id}
                    onClick={() => selectMention(member)}
                    className={`flex items-center space-x-3 px-4 py-2 cursor-pointer transition-colors ${
                      index === mentionCursorIndex
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="bg-blue-600 text-white text-xs">
                        {member.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium">
                        {member.displayName || member.username}
                      </div>
                      {member.displayName && (
                        <div className="text-xs opacity-75">@{member.username}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center space-x-3 bg-black/50 backdrop-blur-md border border-white/30 rounded-xl p-4">
              {/* File Upload Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFileUpload(true)}
                className="w-9 h-9 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                title="Dosya Ekle"
              >
                <ImageIcon className="w-5 h-5" />
              </Button>
              
              <Input
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={`#${channel?.name || 'kanal'} kanalına mesaj`}
                className="flex-1 bg-transparent border-none text-white placeholder-gray-400 focus:ring-0 focus:outline-none text-base"
                autoFocus
              />
              
              {/* Emoji/GIF Picker Button */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="w-9 h-9 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  title="Emoji & GIF"
                >
                  <Smile className="w-5 h-5" />
                </Button>
                
                {showEmojiPicker && (
                  <EmojiGifPicker
                    onSelect={(content, type) => {
                      if (type === 'gif') {
                        // Send GIF directly (pass user and options)
                        sendChannelMessage(content, user, { type: 'gif' });
                      } else {
                        // Add emoji to message
                        setMessage(prev => prev + content);
                      }
                      setShowEmojiPicker(false);
                    }}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                )}
              </div>
              
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