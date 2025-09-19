import React, { useState, useRef, useEffect } from "react";
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

const DirectMessageChat = ({ conversation, onBack }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [contextMenu, setContextMenu] = useState(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Mock DM message history for different conversations
  const dmMessageHistory = {
    dm1: [
      {
        id: "dm1_msg1",
        author: {
          id: "user2",
          username: "Alice",
          avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face"
        },
        content: "Hey! The glassmorphism design looks amazing! 🎨",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        reactions: [{ emoji: "😍", count: 1, users: ["user1"] }]
      },
      {
        id: "dm1_msg2",
        author: {
          id: "user1",
          username: "YourUsername",
          avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face"
        },
        content: "Thanks Alice! I'm really happy with how the frosted glass effects turned out. The dark theme gives it such a premium feel.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1.5),
        reactions: []
      },
      {
        id: "dm1_msg3",
        author: {
          id: "user2",
          username: "Alice",
          avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face"
        },
        content: "The subtle animations are perfect too! Not too flashy but enough to make everything feel alive. How long did it take you to get the blur effects just right?",
        timestamp: new Date(Date.now() - 1000 * 60 * 60),
        reactions: [{ emoji: "👏", count: 1, users: ["user1"] }]
      },
      {
        id: "dm1_msg4",
        author: {
          id: "user1",
          username: "YourUsername",
          avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face"
        },
        content: "It took me a few hours to fine-tune the backdrop-blur values and opacity levels. The key was getting the right balance between transparency and readability.",
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        reactions: []
      },
      {
        id: "dm1_msg5",
        author: {
          id: "user2",
          username: "Alice",
          avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face"
        },
        content: "Well it definitely paid off! This looks way better than regular Fluxy. Are you planning to add more themes?",
        timestamp: new Date(Date.now() - 1000 * 60 * 15),
        reactions: []
      }
    ],
    dm2: [
      {
        id: "dm2_msg1",
        author: {
          id: "user3",
          username: "Bob",
          avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
        },
        content: "Are we still meeting for the project review?",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        reactions: []
      },
      {
        id: "dm2_msg2",
        author: {
          id: "user1",
          username: "YourUsername",
          avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face"
        },
        content: "Yes! I'll be ready in 15 minutes. Should we use the voice channel?",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1.5),
        reactions: []
      },
      {
        id: "dm2_msg3",
        author: {
          id: "user3",
          username: "Bob",
          avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
        },
        content: "Perfect! The General voice channel should work fine. I have all the designs ready to show.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60),
        reactions: [{ emoji: "👍", count: 1, users: ["user1"] }]
      }
    ]
  };

  useEffect(() => {
    // Load message history for current conversation
    const history = dmMessageHistory[conversation.id] || [];
    setMessages(history);
    
    // Simulate typing indicator sometimes
    if (Math.random() > 0.7) {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 3000);
    }
  }, [conversation.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      const newMessage = {
        id: `dm_msg_${Date.now()}`,
        author: {
          id: "user1",
          username: "YourUsername",
          avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face"
        },
        content: message,
        timestamp: new Date(),
        reactions: []
      };
      setMessages([...messages, newMessage]);
      setMessage("");
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
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(timestamp);
  };

  const formatDate = (timestamp) => {
    const today = new Date();
    const messageDate = new Date(timestamp);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return "Today";
    } else {
      return messageDate.toLocaleDateString();
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
    <div className="flex-1 flex flex-col bg-black/20 backdrop-blur-sm">
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
        {messages.map((msg, index) => {
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const showDate = !prevMessage || 
            new Date(msg.timestamp).toDateString() !== new Date(prevMessage.timestamp).toDateString();
          const showAvatar = !prevMessage || 
            prevMessage.author.id !== msg.author.id ||
            new Date(msg.timestamp) - new Date(prevMessage.timestamp) > 300000; // 5 minutes

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex items-center justify-center my-6">
                  <div className="bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
                    <span className="text-xs text-gray-300 font-medium">
                      {formatDate(msg.timestamp)}
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
                    <AvatarImage src={null} alt={msg.author.username} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {msg.author.username.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className="flex-1 min-w-0">
                  {showAvatar && (
                    <div className="flex items-baseline space-x-3 mb-1">
                      <span className="font-semibold text-white text-base">
                        {msg.author.username}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  )}
                  
                  <div className="text-gray-200 text-base leading-relaxed">
                    {msg.content}
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
      <div className="p-4">
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
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
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
    </div>
  );
};

export default DirectMessageChat;