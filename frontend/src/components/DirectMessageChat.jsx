import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import { dmAPI } from "../services/api";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { 
  Phone, 
  Video, 
  UserPlus, 
  MoreHorizontal, 
  Send, 
  Smile, 
  Paperclip, 
  Gift,
  Search,
  Pin,
  Settings,
  Users,
  Bell,
  BellOff
} from "lucide-react";
import ContextMenu from "./ContextMenu";
import FileUploadArea from "./FileUploadArea";

const DirectMessageChat = ({ conversation }) => {
  const { user } = useAuth();
  const { sendMessage, on, isAuthenticated } = useSocket();
  
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  
  // Refs to avoid dependency issues
  const conversationRef = useRef(conversation);
  const userRef = useRef(user);
  const sendMessageRef = useRef(sendMessage);
  
  // Update refs when values change
  useEffect(() => {
    conversationRef.current = conversation;
    userRef.current = user;
    sendMessageRef.current = sendMessage;
  }, [conversation, user, sendMessage]);

  // Load DM messages from API
  const loadMessages = useCallback(async () => {
    if (!conversation?.id) return;

    try {
      setLoading(true);
      const response = await dmAPI.getMessages(conversation.id);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Failed to load DM messages:', error);
      setMessages([]);
      toast.error('Mesajlar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [conversation?.id]);

  // Load messages when conversation changes
  useEffect(() => {
    loadMessages();
  }, [conversation.id, loadMessages]);

  // WebSocket connection status listener
  useEffect(() => {
    if (!on) return;

    try {
      const unsubscribeConnect = on('connect', () => {
        setSocketConnected(true);
      });

      const unsubscribeDisconnect = on('disconnect', () => {
        setSocketConnected(false);
      });

      const unsubscribeError = on('connect_error', () => {
        setSocketConnected(false);
      });

      return () => {
        try {
          unsubscribeConnect();
          unsubscribeDisconnect();
          unsubscribeError();
        } catch (error) {
          console.warn('Error cleaning up connection listeners:', error);
        }
      };
    } catch (error) {
      console.warn('Error setting up connection listeners:', error);
    }
  }, [on]);

  // WebSocket event listeners for real-time messaging
  useEffect(() => {
    if (!isAuthenticated || !isAuthenticated() || !on || !socketConnected) return;

    try {
      const unsubscribeNewMessage = on('newDirectMessage', (newMessage) => {
        // Only add message if it belongs to the current conversation
        if (newMessage.conversationId === conversation.id) {
          setMessages(prev => {
            // Remove optimistic message if this is the real message
            const withoutOptimistic = prev.filter(msg => 
              !(msg.isOptimistic && msg.content === newMessage.content && 
                msg.author.id === newMessage.author.id)
            );
            
            // Check for duplicates
            const exists = withoutOptimistic.some(msg => msg.id === newMessage.id);
            if (exists) return withoutOptimistic;
            
            return [...withoutOptimistic, newMessage];
          });
        }
      });

      const unsubscribeTyping = on('dmTyping', (data) => {
        if (data.conversationId === conversation.id && data.userId !== user?.id) {
          setIsTyping(data.isTyping);
        }
      });

      return () => {
        try {
          unsubscribeNewMessage();
          unsubscribeTyping();
        } catch (error) {
          console.warn('Error unsubscribing from WebSocket events:', error);
        }
      };
    } catch (error) {
      console.warn('Error setting up WebSocket listeners:', error);
    }
  }, [conversation.id, user?.id, on, isAuthenticated, socketConnected]);

  // Scroll to bottom immediately after DOM updates
  useLayoutEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  });


  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || !conversation?.id || !user) return;

    const messageToSend = message.trim();
    setMessage(""); // Clear input immediately

    try {
      // Create optimistic message with real user data
      const optimisticMessage = {
        id: `temp_${Date.now()}`,
        author: {
          id: user.id || user._id,
          username: user.username,
          displayName: user.displayName || user.username,
          avatar: user.avatar
        },
        content: messageToSend,
        timestamp: new Date(),
        reactions: [],
        conversationId: conversation.id,
        isOptimistic: true
      };

      // Add optimistic message immediately
      setMessages(prev => [...prev, optimisticMessage]);

      // Send via API first, then WebSocket will handle real-time delivery
      const response = await dmAPI.sendMessage(conversation.id, messageToSend);
      
      // Remove optimistic message and add real message
      setMessages(prev => {
        const withoutOptimistic = prev.filter(msg => !msg.isOptimistic);
        return [...withoutOptimistic, response.data.message];
      });

    } catch (error) {
      console.error('Failed to send DM:', error);
      // Restore message on error
      setMessage(messageToSend);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => !msg.isOptimistic));
      toast.error('Mesaj gönderilemedi. Tekrar deneyin.');
    }
  }, [message, conversation, user]);

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
    files.forEach(file => {
      const newMessage = {
        id: `dm_file_${Date.now()}-${Math.random()}`,
        author: {
          id: "user1",
          username: "YourUsername",
          avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face"
        },
        content: `📎 ${file.name}`,
        timestamp: new Date(),
        reactions: [],
        file: file
      };
      setMessages(prev => [...prev, newMessage]);
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';

    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '';

      return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.warn('Invalid timestamp format:', timestamp);
      return '';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const today = new Date();
      const messageDate = new Date(timestamp);
      
      if (isNaN(messageDate.getTime())) return '';
      
      if (messageDate.toDateString() === today.toDateString()) {
        return "Today";
      } else {
        return messageDate.toLocaleDateString();
      }
    } catch (error) {
      console.warn('Invalid timestamp format:', timestamp);
      return '';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "idle": return "bg-yellow-500";
      case "dnd": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <>
      {/* DM Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Avatar className="w-10 h-10 ring-2 ring-white/20">
              <AvatarImage src={null} alt={conversation.user?.username || conversation.name} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {(conversation.user?.username || conversation.name).charAt(0)}
              </AvatarFallback>
            </Avatar>
            {conversation.user?.status && (
              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-black/60 ${getStatusColor(conversation.user.status)}`} />
            )}
          </div>
          
          <div>
            <h2 className="text-white font-semibold text-lg">
              {conversation.user?.username || conversation.name}
            </h2>
            {conversation.user?.status && (
              <p className="text-sm text-gray-400 capitalize">
                {conversation.user.status === "online" ? "Online" : 
                 conversation.user.status === "idle" ? "Away" :
                 conversation.user.status === "dnd" ? "Do Not Disturb" : "Offline"}
              </p>
            )}
            {conversation.type === "group" && (
              <p className="text-sm text-gray-400">
                {conversation.members?.length} members
              </p>
            )}
          </div>
        </div>

        {/* DM Actions */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 text-gray-400 hover:text-white hover:bg-white/10"
            title="Start Voice Call"
          >
            <Phone className="w-5 h-5" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 text-gray-400 hover:text-white hover:bg-white/10"
            title="Start Video Call"
          >
            <Video className="w-5 h-5" />
          </Button>

          {conversation.type === "dm" && (
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 text-gray-400 hover:text-white hover:bg-white/10"
              title="Add Friend"
            >
              <UserPlus className="w-5 h-5" />
            </Button>
          )}

          {conversation.type === "group" && (
            <Button
              variant="ghost"
              size="icon"
              className="w-9 h-9 text-gray-400 hover:text-white hover:bg-white/10"
              title="Group Members"
            >
              <Users className="w-5 h-5" />
            </Button>
          )}

          <div className="w-px h-6 bg-white/20 mx-2" />

          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 text-gray-400 hover:text-white hover:bg-white/10"
            title="Pin Messages"
          >
            <Pin className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 text-gray-400 hover:text-white hover:bg-white/10"
            title="Notification Settings"
          >
            <Bell className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 text-gray-400 hover:text-white hover:bg-white/10"
            title="More Options"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        key={conversation.id}
        ref={(el) => {
          messagesContainerRef.current = el;
          if (el) {
            // Immediately scroll to bottom when ref is set
            el.scrollTop = el.scrollHeight;
          }
        }}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20 backdrop-blur-sm"
        style={{ scrollBehavior: 'auto' }}
      >
        {/* Welcome Message */}
        <div className="flex flex-col items-center justify-center py-8">
          <Avatar className="w-20 h-20 ring-4 ring-white/20 mb-4">
            <AvatarImage src={null} alt={conversation.user?.username || conversation.name} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl">
              {(conversation.user?.username || conversation.name).charAt(0)}
            </AvatarFallback>
          </Avatar>
          <h3 className="text-2xl font-bold text-white mb-2">
            {conversation.user?.username || conversation.name}
          </h3>
          <p className="text-gray-400 text-center max-w-md">
            {conversation.type === "dm" 
              ? `This is the beginning of your direct message history with ${conversation.user?.username}.`
              : `This is the beginning of the ${conversation.name} group.`
            }
          </p>
        </div>

        {/* Message History */}
        {messages.filter(msg => msg && (msg.timestamp || msg.createdAt)).map((msg, index) => {
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const msgTimestamp = msg.timestamp || msg.createdAt;
          const prevTimestamp = prevMessage?.timestamp || prevMessage?.createdAt;
          
          const showDate = !prevMessage || !prevTimestamp || !msgTimestamp ||
            new Date(msgTimestamp).toDateString() !== new Date(prevTimestamp).toDateString();
          const showAvatar = !prevMessage || 
            prevMessage.author?.id !== msg.author?.id ||
            !prevTimestamp || !msgTimestamp ||
            new Date(msgTimestamp) - new Date(prevTimestamp) > 300000; // 5 minutes

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex items-center justify-center my-6">
                  <div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
                    <span className="text-xs text-gray-300 font-medium">
                      {formatDate(msgTimestamp)}
                    </span>
                  </div>
                </div>
              )}
              
              <div 
                className={`flex space-x-4 group hover:bg-white/5 px-4 py-2 rounded-lg transition-colors ${
                  showAvatar ? "" : "ml-14"
                }`}
                onContextMenu={(e) => handleRightClick(e, "message", msg)}
              >
                {showAvatar && (
                  <Avatar 
                    className="w-12 h-12 ring-2 ring-white/10 cursor-pointer"
                    onContextMenu={(e) => handleRightClick(e, "user", msg.author)}
                  >
                    <AvatarImage src={null} alt={msg.author?.username || 'User'} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {(msg.author?.username || msg.author?.displayName || 'U').charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className="flex-1 min-w-0">
                  {showAvatar && (
                    <div className="flex items-baseline space-x-3 mb-1">
                      <span className="font-semibold text-white text-base">
                        {msg.author?.displayName || msg.author?.username || 'Unknown User'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(msgTimestamp)}
                      </span>
                    </div>
                  )}
                  
                  <div className={`text-base leading-relaxed ${
                    msg.isOptimistic ? 'text-gray-300 opacity-70' : 'text-gray-200'
                  }`}>
                    {msg.content}
                    {msg.isOptimistic && (
                      <span className="ml-2 text-xs text-gray-500">Gönderiliyor...</span>
                    )}
                  </div>
                  
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {msg.reactions.map((reaction, idx) => (
                        <Button
                          key={idx}
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm"
                        >
                          <span className="mr-1.5">{reaction.emoji}</span>
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

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-center space-x-4 px-4 py-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={null} alt={conversation.user?.username} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                {conversation.user?.username.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/20">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 bg-black/20 backdrop-blur-sm border-t border-white/10">
        <div className="relative">
          <div className="flex items-center space-x-3 bg-black/50 backdrop-blur-md border border-white/30 rounded-xl p-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowFileUpload(true)}
              className="w-9 h-9 text-gray-400 hover:text-white"
            >
              <Paperclip className="w-5 h-5" />
            </Button>
            
            <Input
              value={message}
              onChange={useCallback((e) => setMessage(e.target.value), [])}
              onKeyDown={useCallback((e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }, [handleSendMessage])}
              placeholder={`Message ${conversation.user?.username || conversation.name}`}
              className="flex-1 bg-transparent border-none text-white placeholder-gray-400 focus:ring-0 focus:outline-none text-base"
            />
            
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" className="w-9 h-9 text-gray-400 hover:text-white">
                <Gift className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="w-9 h-9 text-gray-400 hover:text-white">
                <Smile className="w-5 h-5" />
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim()}
                size="icon"
                className="w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

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
    </>
  );
};

export default React.memo(DirectMessageChat);