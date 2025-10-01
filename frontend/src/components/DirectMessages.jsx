import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import { dmAPI, serverAPI } from "../services/api";
import { messageService } from "../features/messages/services/messageService";
import friendsAPI from '../services/friendsAPI';
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { 
  Search, 
  UserPlus, 
  Users, 
  MessageCircle, 
  MessageSquare,
  Phone, 
  Video,
  ArrowLeft,
  UserCheck,
  UserX,
  Shield,
  Check,
  X,
  Compass,
  Globe,
  Star,
  TrendingUp,
  Eye,
  Filter,
  Plus
} from "lucide-react";
import { DirectMessageChat } from "../features/messages";
import FriendsPanel from "./FriendsPanel";

const DirectMessages = ({ onChannelSelect, targetUserId, clearSelection, initiateVoiceCall, currentCall, callState, endCall, toggleMute, isSpeaking, remoteSpeaking, isMuted, remoteMuted, callDuration, isScreenSharing, startScreenShare }) => {
  const { user } = useAuth();
  const { on, isAuthenticated } = useSocket();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  
  // Friends panel is always visible (no toggle needed)
  const showFriends = !selectedConversation; // Show friends when no conversation is selected

  // Pending requests count for badge (loaded separately for sidebar)
  const [pendingRequests, setPendingRequests] = useState([]);

  // Load conversations from API
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await messageService.getConversations();
      
      if (response.success) {
        setConversations(response.data.conversations || []);
      } else {
        setConversations([]);
        toast.error('Sohbetler yüklenirken hata oluştu');
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversations([]);
      toast.error('Sohbetler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load pending requests count for sidebar badge
  const loadPendingRequestsCount = useCallback(async () => {
    try {
      const pendingData = await friendsAPI.getPendingRequests();
      setPendingRequests(pendingData.data || []);
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  }, []);
  
  // Discover servers states
  const [showDiscover, setShowDiscover] = useState(false);
  const [discoverServers, setDiscoverServers] = useState([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverFilter, setDiscoverFilter] = useState('all');
  const [discoverSearch, setDiscoverSearch] = useState('');

  // Load data when component mounts
  useEffect(() => {
    if (user) {
      loadConversations();
      loadPendingRequestsCount();
    }
  }, [user, loadConversations, loadPendingRequestsCount]);

  // Note: Global DM notification listener moved to FluxyApp.jsx
  // This ensures notifications work even when DirectMessages component is unmounted

  // Handle targetUserId prop - auto-open conversation with specific user
  useEffect(() => {
    if (!targetUserId) {
      // If targetUserId is cleared, don't auto-select any conversation
      // This allows users to see the conversation list
      return;
    }
    
    // Friends panel will auto-close when conversation is selected
    
    const handleTargetUser = async () => {
      // First, try to find existing conversation
      if (conversations.length > 0) {
        const existingConversation = conversations.find(conv => 
          conv.user?.id === targetUserId || conv.user?._id === targetUserId
        );
        
        if (existingConversation) {
          setSelectedConversation(existingConversation);
          return;
        }
      }
      
      // If no existing conversation, create new one
      try {
        const response = await dmAPI.createConversation(targetUserId);
        let conv = null;
        
        if (response.success && response.data?.conversation) {
          conv = response.data.conversation;
        } else if (response.conversation) {
          // Handle direct response format
          conv = response.conversation;
        }
        
        if (conv) {
          // Find the other participant (not current user)
          const otherParticipant = conv.participants?.find(p => 
            (p._id || p.id) !== user.id && (p._id || p.id) !== user._id
          );
          
          // Format the conversation to match DirectMessages format
          const formattedConversation = {
            id: conv.id || conv._id,
            type: 'dm',
            user: {
              id: otherParticipant?._id || otherParticipant?.id || targetUserId,
              username: otherParticipant?.username || conv.name || 'Unknown User',
              displayName: otherParticipant?.displayName || otherParticipant?.username || conv.name || 'Unknown User',
              avatar: otherParticipant?.avatar || conv.avatar,
              status: otherParticipant?.status || 'offline'
            },
            participants: conv.participants,
            lastMessage: null,
            lastActivity: conv.lastActivity || new Date(),
            unreadCount: 0
          };
          
          setSelectedConversation(formattedConversation);
          // Refresh conversations to include the new one
          loadConversations();
        }
      } catch (error) {
        console.error('Error creating conversation with target user:', error);
      }
    };
    
    handleTargetUser();
  }, [targetUserId, conversations, loadConversations]);

  // Handle clearSelection prop - clear selected conversation when manually going to DMs
  useEffect(() => {
    if (clearSelection) {
      setSelectedConversation(null);
      // Friends panel will auto-show when conversation is cleared
    }
  }, [clearSelection]);

  // WebSocket connection status listener
  useEffect(() => {
    if (!on) return;

    let unsubscribeConnect, unsubscribeDisconnect, unsubscribeError;

    try {
      unsubscribeConnect = on('connect', () => {
        setSocketConnected(true);
        console.log('✅ WebSocket connected');
      });

      unsubscribeDisconnect = on('disconnect', () => {
        setSocketConnected(false);
        console.warn('❌ WebSocket disconnected');
      });

      unsubscribeError = on('connect_error', (error) => {
        setSocketConnected(false);
        console.warn('⚠️ WebSocket connection error:', error?.message || 'Unknown error');
      });

      return () => {
        try {
          if (unsubscribeConnect) unsubscribeConnect();
          if (unsubscribeDisconnect) unsubscribeDisconnect();
          if (unsubscribeError) unsubscribeError();
        } catch (error) {
          console.warn('Error cleaning up connection listeners:', error);
        }
      };
    } catch (error) {
      console.warn('Error setting up connection listeners:', error);
      return () => {
        // Cleanup in case of setup error
        try {
          if (unsubscribeConnect) unsubscribeConnect();
          if (unsubscribeDisconnect) unsubscribeDisconnect();
          if (unsubscribeError) unsubscribeError();
        } catch (cleanupError) {
          console.warn('Error in cleanup after setup error:', cleanupError);
        }
      };
    }
  }, [on]);

  // WebSocket listeners for real-time updates
  useEffect(() => {
    if (!isAuthenticated || !isAuthenticated() || !on || !socketConnected) return;

    let unsubscribeNewConversation, unsubscribeConversationUpdate, unsubscribeFriendRequest, 
        unsubscribeFriendAccepted, unsubscribeFriendAdded, unsubscribeFriendRemoved;

    try {
      unsubscribeNewConversation = on('newConversation', (conversation) => {
        if (!conversation || !conversation.id) {
          console.warn('Invalid conversation data received:', conversation);
          return;
        }
        
        setConversations(prev => {
          const exists = prev.some(conv => conv.id === conversation.id);
          if (exists) return prev;
          return [conversation, ...prev];
        });
      });

      unsubscribeConversationUpdate = on('conversationUpdate', (updatedConversation) => {
        if (!updatedConversation || !updatedConversation.id) {
          console.warn('Invalid conversation update data received:', updatedConversation);
          return;
        }
        
        setConversations(prev => 
          prev.map(conv => 
            conv.id === updatedConversation.id ? { ...conv, ...updatedConversation } : conv
          )
        );
      });

      // Friend request received - update badge count
      unsubscribeFriendRequest = on('friendRequestReceived', (data) => {
        console.log('📬 Friend request received:', data);
        loadPendingRequestsCount(); // Update badge count
      });

      // Friend request accepted - update badge count
      unsubscribeFriendAccepted = on('friendRequestAccepted', (data) => {
        console.log('🤝 Friend request accepted:', data);
        loadPendingRequestsCount(); // Update badge count
      });

      // Friend added - update badge count
      unsubscribeFriendAdded = on('friendAdded', (data) => {
        console.log('✅ Friend added:', data);
        loadPendingRequestsCount(); // Update badge count
      });

      // Friend removed - update badge count
      unsubscribeFriendRemoved = on('friendRemoved', (data) => {
        console.log('💔 Friend removed:', data);
        loadPendingRequestsCount(); // Update badge count
      });

      return () => {
        try {
          if (unsubscribeNewConversation) unsubscribeNewConversation();
          if (unsubscribeConversationUpdate) unsubscribeConversationUpdate();
          if (unsubscribeFriendRequest) unsubscribeFriendRequest();
          if (unsubscribeFriendAccepted) unsubscribeFriendAccepted();
          if (unsubscribeFriendAdded) unsubscribeFriendAdded();
          if (unsubscribeFriendRemoved) unsubscribeFriendRemoved();
        } catch (error) {
          console.warn('Error unsubscribing from WebSocket events:', error);
        }
      };
    } catch (error) {
      console.warn('Error setting up WebSocket listeners:', error);
      return () => {
        try {
          if (unsubscribeNewConversation) unsubscribeNewConversation();
          if (unsubscribeConversationUpdate) unsubscribeConversationUpdate();
        } catch (cleanupError) {
          console.warn('Error in cleanup after setup error:', cleanupError);
        }
      };
    }
  }, [on, isAuthenticated, socketConnected]);


  // Friends management is now handled by FriendsPanel component

  // Discover servers functions
  const loadDiscoverServers = async () => {
    try {
      setDiscoverLoading(true);
      
      // API'den gerçek sunucu verilerini getir
      const response = await serverAPI.discoverServers();
      
      // API response'unu uygun formata çevir
      let formattedServers = response.data.servers.map(server => ({
        id: server.id || server._id,
        name: server.name,
        description: server.description || 'Açıklama yok',
        icon: server.icon || null,
        members: server.memberCount || 0,
        online: server.onlineCount || 0, // Gerçek çevrimiçi sayısı
        category: server.tags?.[0] || 'Community',
        featured: false, // Will be set below
        tags: server.tags || ['Community'],
        inviteCode: server.inviteCode,
        isMember: server.isMember || false // Backend'den gelen member status
      }));
      
      // Kullanıcının katıldığı sunucuları filtrele
      formattedServers = formattedServers.filter(server => !server.isMember);
      
      // Kullanıcı sayısına göre azalan sıralama
      formattedServers.sort((a, b) => b.members - a.members);
      
      // Öne çıkan sunucuları belirle: En fazla üyeye sahip ilk 5 sunucu veya 50+ üyesi olanlar
      const topServerIds = formattedServers.slice(0, 5).map(s => s.id);
      formattedServers = formattedServers.map(server => ({
        ...server,
        featured: topServerIds.includes(server.id) || server.members >= 50
      }));
      
      setDiscoverServers(formattedServers);
      
    } catch (error) {
      console.error('Failed to load discover servers:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error('Sunucular yüklenirken hata oluştu');
    } finally {
      setDiscoverLoading(false);
    }
  };

  const getFilteredServers = () => {
    let filtered = discoverServers;
    
    // Category filter
    if (discoverFilter !== 'all') {
      filtered = filtered.filter(server => 
        server.category.toLowerCase() === discoverFilter.toLowerCase()
      );
    }
    
    // Search filter
    if (discoverSearch) {
      filtered = filtered.filter(server =>
        server.name.toLowerCase().includes(discoverSearch.toLowerCase()) ||
        server.description.toLowerCase().includes(discoverSearch.toLowerCase()) ||
        server.tags.some(tag => tag.toLowerCase().includes(discoverSearch.toLowerCase()))
      );
    }
    
    return filtered;
  };

  const formatMemberCount = (count) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  };

  const handleJoinServer = async (serverId) => {
    try {
      // Gerçek join server API call
      await serverAPI.joinServer(serverId);
      
      // Başarılı katılım sonrası kullanıcıyı bilgilendir
      toast.success("Sunucuya başarıyla katıldınız!");
      
      // Local state'i güncelle - bu sunucuda artık member'ız
      setDiscoverServers(prevServers => 
        prevServers.map(server => 
          server.id === serverId 
            ? { ...server, isMember: true, memberCount: server.memberCount + 1 }
            : server
        )
      );
      
      // Keşfet listesini güncelle (backend'den fresh data al)
      await loadDiscoverServers();
      
    } catch (error) {
      console.error('Failed to join server:', error);
      
      // Kullanıcıya hata mesajı göster
      if (error.message?.includes('already a member')) {
        // Zaten üye - state'i güncelle
        setDiscoverServers(prevServers => 
          prevServers.map(server => 
            server.id === serverId 
              ? { ...server, isMember: true }
              : server
          )
        );
        toast.info("Bu sunucuya zaten üyesiniz!");
      } else if (error.response?.status === 404) {
        toast.error("Sunucu bulunamadı!");
      } else {
        toast.error("Sunucuya katılırken bir hata oluştu.");
      }
    }
  };

  // Format message content safely
  const formatMessageContent = (message) => {
    if (!message) return "Henüz mesaj yok";
    
    // If message is an object, extract content
    if (typeof message === 'object') {
      return message.content || message.text || "Mesaj içeriği yok";
    }
    
    // If message is a string, return it
    return String(message);
  };

  // Format last activity safely
  const formatLastActivity = (timestamp) => {
    if (!timestamp) return "";
    return formatTime(timestamp);
  };

  // Get display name safely
  const getDisplayName = (dmUser, dmName) => {
    if (dmUser) {
      return dmUser.displayName || dmUser.username || "Bilinmeyen Kullanıcı";
    }
    return dmName || "Bilinmeyen Sohbet";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "idle": return "bg-yellow-500";
      case "dnd": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) {
      return "Unknown";
    }
    
    const date = new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
    
    const now = new Date();
    const diff = now - date;
    
    if (diff < 1000 * 60 * 60) {
      return `${Math.floor(diff / (1000 * 60))}m ago`;
    } else if (diff < 1000 * 60 * 60 * 24) {
      return `${Math.floor(diff / (1000 * 60 * 60))}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleConversationSelect = (conversation) => {
    setSelectedConversation(conversation);
  };

  const handleBack = () => {
    setSelectedConversation(null);
  };

  // Discord-style layout: Always show sidebar, chat on the right when selected

  return (
    <div className="flex-1 flex h-full max-h-screen overflow-hidden">
      {/* Direct Messages Sidebar - Always Visible on Desktop, Hidden on Mobile when Chat is Open */}
      <div className={`w-72 bg-black/40 backdrop-blur-md border-r border-white/10 flex flex-col h-full flex-shrink-0 ${
        selectedConversation ? 'hidden md:flex' : 'flex'
      }`}>
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Sohbet bul veya başlat"
              className="pl-10 bg-black/30 border-white/20 text-white placeholder-gray-400 focus:border-blue-500 h-8"
            />
          </div>
        </div>

        {/* Direct Messages - Enhanced */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          {/* Friends Button - Always Active (Non-clickable) */}
          <div className="mb-4">
            <div className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600/30 to-purple-600/30 text-white border-2 border-blue-500/50 shadow-lg shadow-blue-500/20 cursor-default">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/30">
                <Users className="w-5 h-5 text-blue-300" />
              </div>
              <span className="font-semibold text-base flex-1 text-left">Arkadaşlar</span>
              {pendingRequests.length > 0 && (
                <Badge className="bg-red-600 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                  {pendingRequests.length}
                </Badge>
              )}
            </div>
          </div>

          <div className="mb-4 pb-2 border-b border-white/10">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-white font-semibold text-base flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-blue-400" />
                </div>
                <span>Direkt Mesajlar</span>
              </h3>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-white/10 text-white/80 border-white/20 text-xs">
                  {conversations.length} sohbet
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            {conversations
              .filter(dm => 
                dm.user?.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                dm.user?.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                dm.name?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((dm) => (
                <div
                  key={dm.id}
                  onClick={() => handleConversationSelect(dm)}
                  className={`relative bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm rounded-xl border border-white/10 p-4 hover:from-gray-700/40 hover:to-gray-800/40 hover:border-white/20 hover:shadow-lg hover:shadow-black/20 transition-all duration-300 cursor-pointer group ${
                    (dm.unreadCount > 0 || dm.unread > 0) ? 'ring-1 ring-blue-400/50 shadow-md shadow-blue-400/20' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    {dm.type === "dm" ? (
                      <div className="relative">
                        <div className="relative w-12 h-12 rounded-full overflow-hidden transition-all duration-300 ring-2 ring-white/10 group-hover:ring-white/20 group-hover:scale-105">
                          <Avatar className="w-full h-full">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                              {(dm.user?.username || "U").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        {/* Status dot removed as requested */}
                      </div>
                    ) : (
                      <div className="relative w-12 h-12 rounded-full overflow-hidden transition-all duration-300 ring-2 ring-white/10 group-hover:ring-white/20 group-hover:scale-105">
                        <Avatar className="w-full h-full">
                          <AvatarImage src={dm.icon} alt={dm.name || "Group"} className="object-cover" />
                          <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-600 text-white font-bold">
                            {(dm.name || "G").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-white truncate">
                          {getDisplayName(dm.user, dm.name)}
                        </span>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatLastActivity(dm.lastMessage?.timestamp || dm.lastActivity)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 truncate">
                        {formatMessageContent(dm.lastMessage)}
                      </p>
                    </div>
                    
                    {(dm.unreadCount > 0 || dm.unread > 0) && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="destructive" className="bg-red-500/90 text-white text-xs px-2 py-1 min-w-[20px] h-5 flex items-center justify-center shadow-lg shadow-red-500/30">
                          {dm.unreadCount || dm.unread}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Main Content Area - Chat, Friends, or Welcome Screen */}
      <div className="flex-1 flex flex-col bg-black/20 backdrop-blur-sm">
        {showFriends ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Discover Servers Button */}
            <div className="p-4 border-b border-white/10 flex-shrink-0">
              <Button
                onClick={() => {
                  setShowDiscover(true);
                  loadDiscoverServers();
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
              >
                <Compass className="w-5 h-5 mr-2" />
                Herkese Açık Tüm Sunucuları Keşfet
              </Button>
            </div>
            {/* Friends Panel */}
            <div className="flex-1 overflow-hidden">
              <FriendsPanel 
                onStartConversation={async (userId, friendData) => {
                  try {
                    console.log('🔵 Starting conversation with user:', userId, 'Friend data:', friendData);
                    
                    // First check if conversation already exists
                    const existingConv = conversations.find(conv => 
                      conv.user?.id === userId || conv.user?._id === userId
                    );
                    
                    if (existingConv) {
                      console.log('✅ Found existing conversation:', existingConv);
                      setSelectedConversation(existingConv);
                      toast.success('Sohbet açıldı');
                      return;
                    }
                    
                    // Create new conversation
                    const response = await dmAPI.createConversation(userId);
                    console.log('📩 Conversation response:', response);
                    
                    let conv = null;
                    
                    if (response.success && response.data?.conversation) {
                      conv = response.data.conversation;
                    } else if (response.conversation) {
                      conv = response.conversation;
                    } else if (response.data) {
                      conv = response.data;
                    }
                    
                    if (conv) {
                      const otherParticipant = conv.participants?.find(p => 
                        (p._id || p.id) !== user.id && (p._id || p.id) !== user._id
                      );
                      
                      // Use friend data if available, fallback to participant data
                      const userData = friendData || otherParticipant || {};
                      
                      const formattedConversation = {
                        id: conv.id || conv._id,
                        type: 'dm',
                        user: {
                          id: userData.id || userData._id || userId,
                          username: userData.username || 'Unknown User',
                          displayName: userData.displayName || userData.username || 'Unknown User',
                          avatar: userData.avatar,
                          status: userData.status || 'offline'
                        },
                        participants: conv.participants,
                        lastMessage: null,
                        lastActivity: conv.lastActivity || new Date(),
                        unreadCount: 0
                      };
                      
                      console.log('✅ Opening conversation:', formattedConversation);
                      setSelectedConversation(formattedConversation);
                      await loadConversations();
                      toast.success('Sohbet açıldı');
                    } else {
                      console.error('❌ No conversation data received');
                      toast.error('Sohbet oluşturulamadı');
                    }
                  } catch (error) {
                    console.error('❌ Error starting conversation:', error);
                    toast.error('Sohbet başlatılamadı: ' + (error.message || 'Bilinmeyen hata'));
                  }
                }}
              />
            </div>
          </div>
        ) : selectedConversation ? (
          <div className="flex-1 flex flex-col relative h-full max-h-full overflow-hidden">
            <div className="absolute top-4 left-4 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="w-10 h-10 bg-gray-800/90 backdrop-blur-md border border-gray-600/50 text-gray-300 hover:text-white hover:bg-gray-700/90 shadow-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </div>
            <DirectMessageChat 
              key={selectedConversation.id}
              conversation={selectedConversation}
              initiateVoiceCall={initiateVoiceCall}
              currentCall={currentCall}
              callState={callState}
              endCall={endCall}
              toggleMute={toggleMute}
              isSpeaking={isSpeaking}
              remoteSpeaking={remoteSpeaking}
              isMuted={isMuted}
              remoteMuted={remoteMuted}
              callDuration={callDuration}
              isScreenSharing={isScreenSharing}
              startScreenShare={startScreenShare}
            />
          </div>
        ) : null}
      </div>

      {/* Discover Servers Modal */}
      {showDiscover && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/90 backdrop-blur-md rounded-2xl border border-white/20 w-[90vw] max-w-6xl h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Compass className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Sunucuları Keşfet</h2>
                  <p className="text-gray-400">İlgi alanlarınıza uygun toplulukları bulun</p>
                </div>
              </div>
              <Button
                onClick={() => setShowDiscover(false)}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Search and Filters */}
            <div className="p-6 border-b border-white/10 space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search Bar */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={discoverSearch}
                    onChange={(e) => setDiscoverSearch(e.target.value)}
                    placeholder="Sunucu ara..."
                    className="pl-10 bg-black/40 border-white/20 text-white placeholder-gray-400 focus:border-blue-500"
                  />
                </div>

                {/* Category Filter */}
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <Select value={discoverFilter} onValueChange={setDiscoverFilter}>
                    <SelectTrigger className="w-48 bg-black/40 border-white/20 text-white focus:border-blue-500">
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-white/20 text-white">
                      <SelectItem value="all" className="focus:bg-white/10 focus:text-white">Tüm Kategoriler</SelectItem>
                      <SelectItem value="gaming" className="focus:bg-white/10 focus:text-white">🎮 Oyun</SelectItem>
                      <SelectItem value="technology" className="focus:bg-white/10 focus:text-white">💻 Teknoloji</SelectItem>
                      <SelectItem value="music" className="focus:bg-white/10 focus:text-white">🎵 Müzik</SelectItem>
                      <SelectItem value="art" className="focus:bg-white/10 focus:text-white">🎨 Sanat</SelectItem>
                      <SelectItem value="education" className="focus:bg-white/10 focus:text-white">📚 Eğitim</SelectItem>
                      <SelectItem value="community" className="focus:bg-white/10 focus:text-white">👥 Topluluk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Servers List */}
            <div className="flex-1 overflow-y-auto p-6">
              {discoverLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Featured Servers */}
                  {getFilteredServers().filter(server => server.featured).length > 0 && (
                    <div>
                      <div className="flex items-center space-x-2 mb-4">
                        <Star className="w-5 h-5 text-yellow-400" />
                        <h3 className="text-lg font-semibold text-white">Öne Çıkan Sunucular</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                        {getFilteredServers()
                          .filter(server => server.featured)
                          .map((server) => (
                            <div
                              key={server.id}
                              className="bg-black/40 backdrop-blur-md rounded-lg border border-white/10 p-4 hover:bg-white/5 transition-colors"
                            >
                              <div className="flex items-start space-x-4">
                                <img
                                  src={server.icon}
                                  alt={server.name}
                                  className="w-16 h-16 rounded-lg object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-lg font-semibold text-white truncate">{server.name}</h4>
                                    <div className="flex items-center space-x-1">
                                      <Star className="w-4 h-4 text-yellow-400" />
                                      <span className="text-sm text-yellow-400">Öne Çıkan</span>
                                    </div>
                                  </div>
                                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">{server.description}</p>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4 text-sm">
                                      <div className="flex items-center space-x-1">
                                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                        <span className="text-gray-400">{formatMemberCount(server.online)} çevrimiçi</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <Users className="w-3 h-3 text-gray-400" />
                                        <span className="text-gray-400">{formatMemberCount(server.members)} üye</span>
                                      </div>
                                    </div>
                                    <Button
                                      onClick={() => handleJoinServer(server.id)}
                                      size="sm"
                                      className={
                                        server.isMember
                                          ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                                          : "bg-green-600 hover:bg-green-700 text-white"
                                      }
                                      disabled={server.isMember}
                                    >
                                      {server.isMember ? "Zaten Katıldın" : "Katıl"}
                                    </Button>
                                  </div>
                                  <div className="flex flex-wrap gap-1 mt-3">
                                    {server.tags.slice(0, 3).map((tag, index) => (
                                      <span
                                        key={index}
                                        className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Other Servers */}
                  {getFilteredServers().filter(server => !server.featured).length > 0 && (
                    <div>
                      <div className="flex items-center space-x-2 mb-4">
                        <Globe className="w-5 h-5 text-blue-400" />
                        <h3 className="text-lg font-semibold text-white">Diğer Sunucular</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {getFilteredServers()
                          .filter(server => !server.featured)
                          .map((server) => (
                            <div
                              key={server.id}
                              className="bg-black/40 backdrop-blur-md rounded-lg border border-white/10 p-4 hover:bg-white/5 transition-colors"
                            >
                              <div className="flex items-start space-x-4">
                                <img
                                  src={server.icon}
                                  alt={server.name}
                                  className="w-16 h-16 rounded-lg object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-lg font-semibold text-white truncate mb-2">{server.name}</h4>
                                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">{server.description}</p>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4 text-sm">
                                      <div className="flex items-center space-x-1">
                                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                        <span className="text-gray-400">{formatMemberCount(server.online)} çevrimiçi</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <Users className="w-3 h-3 text-gray-400" />
                                        <span className="text-gray-400">{formatMemberCount(server.members)} üye</span>
                                      </div>
                                    </div>
                                    <Button
                                      onClick={() => handleJoinServer(server.id)}
                                      size="sm"
                                      className={
                                        server.isMember
                                          ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                                          : "bg-green-600 hover:bg-green-700 text-white"
                                      }
                                      disabled={server.isMember}
                                    >
                                      {server.isMember ? "Zaten Katıldın" : "Katıl"}
                                    </Button>
                                  </div>
                                  <div className="flex flex-wrap gap-1 mt-3">
                                    {server.tags.slice(0, 3).map((tag, index) => (
                                      <span
                                        key={index}
                                        className="px-2 py-1 bg-gray-600/30 text-gray-300 text-xs rounded-full"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* No Results */}
                  {getFilteredServers().length === 0 && !discoverLoading && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">Sonuç bulunamadı</h3>
                      <p className="text-gray-400">Arama kriterlerinizi değiştirip tekrar deneyin.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectMessages;