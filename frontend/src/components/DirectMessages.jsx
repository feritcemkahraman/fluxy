import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import { dmAPI, serverAPI } from "../services/api";
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
import DirectMessageChat from "./DirectMessageChat";

const DirectMessages = ({ onChannelSelect }) => {
  const { user } = useAuth();
  const { on, isAuthenticated } = useSocket();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);

  // Friends data states
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [addFriendQuery, setAddFriendQuery] = useState('');
  const [friendsError, setFriendsError] = useState('');

  // Load conversations from API
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await dmAPI.getConversations();
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversations([]);
      toast.error('Sohbetler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load friends data
  const loadFriendsData = useCallback(async () => {
    try {
      const [friendsData, pendingData, sentData, blockedData] = await Promise.all([
        friendsAPI.getFriends(),
        friendsAPI.getPendingRequests(),
        friendsAPI.getSentRequests(),
        friendsAPI.getBlockedUsers()
      ]);
      
      setFriends(friendsData.data || []);
      setPendingRequests(pendingData.data || []);
      setSentRequests(sentData.data || []);
      setBlockedUsers(blockedData.data || []);
    } catch (error) {
      console.error('Error loading friends data:', error);
      toast.error('Arkadaş verileri yüklenirken hata oluştu');
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
      loadFriendsData();
    }
  }, [user, loadConversations, loadFriendsData]);

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

    let unsubscribeNewConversation, unsubscribeConversationUpdate;

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

      return () => {
        try {
          if (unsubscribeNewConversation) unsubscribeNewConversation();
          if (unsubscribeConversationUpdate) unsubscribeConversationUpdate();
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


  // Friends management functions

  const handleSendFriendRequest = async (username) => {
    try {
      await friendsAPI.sendFriendRequest(username);
      setAddFriendQuery('');
      await loadFriendsData();
      setFriendsError('');
    } catch (error) {
      setFriendsError(error.response?.data?.message || 'Failed to send friend request');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await friendsAPI.acceptFriendRequest(requestId);
      await loadFriendsData();
    } catch (error) {
      setFriendsError('Failed to accept friend request');
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      await friendsAPI.declineFriendRequest(requestId);
      await loadFriendsData();
    } catch (error) {
      setFriendsError('Failed to decline friend request');
    }
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      await friendsAPI.removeFriend(friendId);
      await loadFriendsData();
    } catch (error) {
      setFriendsError('Failed to remove friend');
    }
  };

  const handleBlockUser = async (userId) => {
    try {
      await friendsAPI.blockUser(userId);
      await loadFriendsData();
    } catch (error) {
      setFriendsError('Failed to block user');
    }
  };

  // Discover servers functions
  const loadDiscoverServers = async () => {
    try {
      setDiscoverLoading(true);
      
      // API'den gerçek sunucu verilerini getir
      const response = await serverAPI.discoverServers();
      
      // API response'unu uygun formata çevir
      const formattedServers = response.data.servers.map(server => ({
        id: server.id,
        name: server.name,
        description: server.description || 'Açıklama yok',
        icon: server.icon || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&h=150&fit=crop',
        members: server.memberCount || 0,
        online: Math.floor((server.memberCount || 0) * 0.3), // Estimate online members
        category: server.tags?.[0] || 'Community',
        featured: server.memberCount >= 1, // 1 veya daha fazla üyesi olan sunucular featured olabilir
        tags: server.tags || ['Community'],
        inviteCode: server.inviteCode,
        isMember: server.isMember || false // Backend'den gelen member status
      }));
      
      setDiscoverServers(formattedServers);
      
      // Fallback olarak mock data kullan eğer API'den veri gelmazse
      if (formattedServers.length === 0) {
        const mockServers = [
          {
            id: '1',
            name: 'Genshin Impact Official',
            description: 'Welcome to Teyvat, Traveler! This is the place to discuss with others about your favorite game, Genshin Impact!',
            icon: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=150&h=150&fit=crop',
            members: 340150,
            online: 2135047,
            category: 'Gaming',
            featured: true,
            tags: ['Gaming', 'Anime', 'Community']
          },
          {
            id: '2',
            name: 'VALORANT',
            description: 'The official Discord server for VALORANT! Find the latest news and discuss the game!',
            icon: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&h=150&fit=crop',
            members: 714435,
            online: 173376,
            category: 'Gaming',
            featured: true,
            tags: ['Gaming', 'FPS', 'Competitive']
          },
          {
            id: '3',
            name: 'Midjourney',
            description: 'The official server for Midjourney, a text-to-image AI where your imagination is the only limit.',
            icon: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=150&h=150&fit=crop',
            members: 728398,
            online: 20515749,
            category: 'Technology',
            featured: true,
            tags: ['AI', 'Art', 'Technology']
          },
          {
            id: '4',
            name: 'Lofi Hip Hop',
            description: 'A chill community for lofi lovers to study, work, and relax together.',
            icon: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=150&h=150&fit=crop',
            members: 45230,
            online: 12450,
            category: 'Music',
            featured: false,
            tags: ['Music', 'Chill', 'Study']
          },
          {
            id: '5',
            name: 'Coding Community',
            description: 'Learn, share, and grow together as developers. All programming languages welcome!',
            icon: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=150&h=150&fit=crop',
            members: 67890,
            online: 8234,
            category: 'Technology',
            featured: false,
            tags: ['Programming', 'Learning', 'Community']
          },
          {
            id: '6',
            name: 'Art & Design Hub',
            description: 'Share your artwork, get feedback, and connect with fellow artists and designers.',
            icon: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=150&h=150&fit=crop',
            members: 23456,
            online: 3456,
            category: 'Art',
            featured: false,
            tags: ['Art', 'Design', 'Creative']
          }
        ];
        setDiscoverServers(mockServers);
      }
    } catch (error) {
      console.error('Failed to load discover servers:', error);
      console.error('Error details:', error.response?.data || error.message);
      
      // Hata durumunda mock data kullan
      const mockServers = [
        {
          id: '1',
          name: 'Genshin Impact Official',
          description: 'Welcome to Teyvat, Traveler! This is the place to discuss with others about your favorite game, Genshin Impact!',
          icon: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=150&h=150&fit=crop',
          members: 340150,
          online: 2135047,
          category: 'Gaming',
          featured: true,
          tags: ['Gaming', 'Anime', 'Community']
        },
        {
          id: '2',
          name: 'VALORANT',
          description: 'The official Discord server for VALORANT! Find the latest news and discuss the game!',
          icon: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150&h=150&fit=crop',
          members: 714435,
          online: 173376,
          category: 'Gaming',
          featured: true,
          tags: ['Gaming', 'FPS', 'Competitive']
        }
      ];
      setDiscoverServers(mockServers);
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
      toast({
        title: "Başarılı!",
        description: "Sunucuya başarıyla katıldınız!",
        duration: 3000,
      });
      
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
      if (error.response?.status === 400) {
        toast({
          title: "Hata",
          description: "Bu sunucuya zaten üyesiniz!",
          variant: "destructive",
          duration: 3000,
        });
      } else if (error.response?.status === 404) {
        toast({
          title: "Hata",
          description: "Sunucu bulunamadı!",
          variant: "destructive",
          duration: 3000,
        });
      } else {
        toast({
          title: "Hata",
          description: "Sunucuya katılırken bir hata oluştu.",
          variant: "destructive",
          duration: 3000,
        });
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
    <div className="flex-1 flex h-full">
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

        {/* Direct Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-2">
            Direkt Mesajlar
          </h3>
          <div className="space-y-1">
            {conversations
              .filter(dm => 
                dm.user?.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                dm.user?.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                dm.name?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((dm) => (
                <Button
                  key={dm.id}
                  variant="ghost"
                  onClick={() => handleConversationSelect(dm)}
                  className="w-full justify-start p-3 text-left hover:bg-white/10 transition-colors rounded-md"
                >
                  <div className="flex items-center space-x-2.5 w-full">
                    {dm.type === "dm" ? (
                      <div className="relative">
                        <Avatar className="w-8 h-8 ring-1 ring-white/10">
                          <AvatarImage src={null} alt={dm.user?.username || "User"} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                            {(dm.user?.username || "U").charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black/50 ${getStatusColor(dm.user?.status)}`} />
                      </div>
                    ) : (
                      <Avatar className="w-10 h-10 ring-2 ring-white/10">
                        <AvatarImage src={dm.icon} alt={dm.name || "Group"} />
                        <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-600 text-white text-sm">
                          {(dm.name || "G").charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white truncate">
                          {getDisplayName(dm.user, dm.name)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatLastActivity(dm.lastMessage?.timestamp || dm.lastActivity)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        {formatMessageContent(dm.lastMessage)}
                      </p>
                    </div>
                    
                    {(dm.unreadCount > 0 || dm.unread > 0) && (
                      <Badge variant="destructive" className="text-xs px-1.5 py-0.5 min-w-[16px] h-4 flex items-center justify-center">
                        {dm.unreadCount || dm.unread}
                      </Badge>
                    )}
                  </div>
                </Button>
              ))}
          </div>
        </div>
      </div>

      {/* Main Content Area - Chat or Welcome Screen */}
      <div className="flex-1 flex flex-col bg-black/20 backdrop-blur-sm">
        {selectedConversation ? (
          /* Chat Interface */
          <div className="flex-1 flex flex-col relative">
            {/* Mobile Back Button */}
            <div className="md:hidden absolute top-4 left-4 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="w-10 h-10 bg-black/50 backdrop-blur-md border border-white/20 text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </div>
            <DirectMessageChat 
              key={selectedConversation.id}
              conversation={selectedConversation}
            />
          </div>
        ) : (
          /* Welcome Screen with Friends Management */
          <>
        {/* Welcome Header */}
        <div className="p-6 border-b border-white/10">
          <div className="max-w-4xl mx-auto">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Direkt Mesajlara Hoş Geldiniz</h1>
              <p className="text-gray-400">Arkadaşlarınızla sohbet edin ve yeni bağlantılar kurun</p>
            </div>
          </div>
        </div>

        {/* Friends Management Section */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Discover Servers Button */}
            <div className="bg-black/40 backdrop-blur-md rounded-lg border border-white/10 p-4">
              <Button
                onClick={() => {
                  setShowDiscover(true);
                  loadDiscoverServers(); // Keşfet butonuna tıklandığında sunucuları yükle
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02]"
              >
                <Compass className="w-5 h-5 mr-2" />
                Keşfet
                <span className="ml-2 text-sm opacity-80">- Sunucuları keşfedin</span>
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-black/40 backdrop-blur-md rounded-lg p-4 border border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{friends.filter(f => f.status === 'online').length}</div>
                    <div className="text-sm text-gray-400">Çevrimiçi Arkadaş</div>
                  </div>
                </div>
              </div>

              <div className="bg-black/40 backdrop-blur-md rounded-lg p-4 border border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{pendingRequests.length}</div>
                    <div className="text-sm text-gray-400">Bekleyen İstek</div>
                  </div>
                </div>
              </div>

              <div className="bg-black/40 backdrop-blur-md rounded-lg p-4 border border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <Plus className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white">{friends.length}</div>
                    <div className="text-sm text-gray-400">Toplam Arkadaş</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Conversations */}
            {conversations.length > 0 && (
              <div className="bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
                <div className="p-4 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white">Son Sohbetler</h3>
                </div>
                <div className="p-4 space-y-3">
                  {conversations.slice(0, 5).map((dm) => (
                    <div 
                      key={dm.id}
                      onClick={() => handleConversationSelect(dm)}
                      className="flex items-center space-x-3 p-4 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      {dm.type === "dm" ? (
                        <div className="relative">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={null} alt={dm.user?.username || "User"} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                              {(dm.user?.username || "U").charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-black/50 ${getStatusColor(dm.user?.status)}`} />
                        </div>
                      ) : (
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={dm.icon} alt={dm.name || "Group"} />
                          <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-600 text-white">
                            {(dm.name || "G").charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium">{getDisplayName(dm.user, dm.name)}</div>
                        <div className="text-sm text-gray-400 truncate">{formatMessageContent(dm.lastMessage)}</div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatLastActivity(dm.lastActivity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Friend Section */}
            <div className="bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
              <div className="p-4 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white">Arkadaş Ekle</h3>
                <p className="text-sm text-gray-400 mt-1">Kullanıcı adıyla yeni arkadaş ekleyin</p>
              </div>
              <div className="p-4">
                <div className="flex space-x-2">
                  <Input
                    value={addFriendQuery}
                    onChange={(e) => setAddFriendQuery(e.target.value)}
                    placeholder="Kullanıcı adı girin"
                    className="flex-1 bg-black/30 border-white/20 text-white placeholder-gray-400 focus:border-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendFriendRequest(addFriendQuery)}
                  />
                  <Button
                    onClick={() => handleSendFriendRequest(addFriendQuery)}
                    disabled={!addFriendQuery.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {friendsError && (
                  <div className="mt-2 text-sm text-red-400">
                    {friendsError}
                  </div>
                )}
              </div>
            </div>

            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <div className="bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
                <div className="p-4 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white">Bekleyen İstekler</h3>
                </div>
                <div className="p-4 space-y-3">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={null} alt={request.from.displayName || request.from.username} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                            {(request.from.displayName || request.from.username).charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-white font-medium">{request.from.displayName || request.from.username}</div>
                          {request.message && (
                            <div className="text-sm text-gray-400">{request.message}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          onClick={() => handleAcceptRequest(request.id)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button 
                          onClick={() => handleDeclineRequest(request.id)}
                          size="sm"
                          variant="outline"
                          className="border-red-500 text-red-400 hover:bg-red-500/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {conversations.length === 0 && friends.length === 0 && (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto bg-white/10 rounded-full backdrop-blur-md flex items-center justify-center mb-4">
                  <MessageSquare className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Henüz hiç sohbet yok</h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  Arkadaşlarınızla sohbet etmek için yukarıdaki arama kutusunu kullanın veya yeni arkadaş ekleyin.
                </p>
              </div>
            )}
          </div>
        </div>
        </>
        )}
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
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
                      <div className="space-y-3">
                        {getFilteredServers()
                          .filter(server => !server.featured)
                          .map((server) => (
                            <div
                              key={server.id}
                              className="bg-black/40 backdrop-blur-md rounded-lg border border-white/10 p-4 hover:bg-white/5 transition-colors"
                            >
                              <div className="flex items-center space-x-4">
                                <img
                                  src={server.icon}
                                  alt={server.name}
                                  className="w-12 h-12 rounded-lg object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <h4 className="text-base font-semibold text-white truncate">{server.name}</h4>
                                    <div className="flex items-center space-x-4 text-sm">
                                      <div className="flex items-center space-x-1">
                                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                        <span className="text-gray-400">{formatMemberCount(server.online)}</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <Users className="w-3 h-3 text-gray-400" />
                                        <span className="text-gray-400">{formatMemberCount(server.members)}</span>
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
                                        {server.isMember ? "Katıldın" : "Katıl"}
                                      </Button>
                                    </div>
                                  </div>
                                  <p className="text-gray-400 text-sm mb-2 line-clamp-1">{server.description}</p>
                                  <div className="flex flex-wrap gap-1">
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