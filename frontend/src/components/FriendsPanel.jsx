import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  UserX, 
  Search, 
  Send, 
  Check, 
  X, 
  MoreHorizontal,
  Shield,
  MessageCircle,
  ArrowLeft,
  Clock
} from 'lucide-react';
import { friendsAPI } from '../services/api';
import { Avatar, AvatarFallback } from "./ui/avatar";
import { useSocket } from '../hooks/useSocket';

const FriendsPanel = ({ onBack, onStartConversation }) => {
  const { on } = useSocket();
  const [activeTab, setActiveTab] = useState('online');
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addFriendQuery, setAddFriendQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFriendsData();
  }, []);

  // Real-time status updates
  useEffect(() => {
    if (!on) return;

    const handleStatusUpdate = ({ userId, status }) => {
      // Update friend status in real-time
      setFriends(prev => prev.map(friend => 
        (friend.id === userId || friend._id === userId)
          ? { ...friend, status }
          : friend
      ));
    };

    const unsubscribe = on('userStatusUpdate', handleStatusUpdate);

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [on]);

  const loadFriendsData = async () => {
    try {
      setLoading(true);
      const [friendsData, pendingData, sentData, blockedData] = await Promise.all([
        friendsAPI.getFriends(),
        friendsAPI.getPendingRequests(),
        friendsAPI.getSentRequests(),
        friendsAPI.getBlockedUsers()
      ]);

      // Handle response (already unwrapped by API)
      setFriends(friendsData || []);
      setPendingRequests(pendingData || []);
      setSentRequests(sentData || []);
      setBlockedUsers(blockedData || []);
    } catch (error) {
      setError('Failed to load friends data');
      console.error('Load friends data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await friendsAPI.searchUsers(query);
      setSearchResults(results);
    } catch (error) {
      // console.error('Search error:', error);
      setError('Search failed');
    }
  };

  const handleSendFriendRequest = async (username) => {
    try {
      await friendsAPI.sendFriendRequest(username);
      setAddFriendQuery('');
      await loadFriendsData();
      setError('');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to send friend request');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await friendsAPI.acceptFriendRequest(requestId);
      await loadFriendsData();
    } catch (error) {
      setError('Failed to accept friend request');
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      await friendsAPI.declineFriendRequest(requestId);
      await loadFriendsData();
    } catch (error) {
      setError('Failed to decline friend request');
    }
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      await friendsAPI.removeFriend(friendId);
      await loadFriendsData();
    } catch (error) {
      setError('Failed to remove friend');
    }
  };

  const handleBlockUser = async (userId) => {
    try {
      await friendsAPI.blockUser(userId);
      await loadFriendsData();
    } catch (error) {
      setError('Failed to block user');
    }
  };

  const handleUnblockUser = async (userId) => {
    try {
      await friendsAPI.unblockUser(userId);
      await loadFriendsData();
    } catch (error) {
      setError('Failed to unblock user');
    }
  };

  const handleStartConversation = (friend) => {
    if (onStartConversation) {
      // Call parent component's handler to open DM with this user
      const userId = friend.id || friend._id;
      // Pass both userId and friend data
      onStartConversation(userId, friend);
    } else {
      setError('Mesajlaşma özelliği şu anda kullanılamıyor');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'dnd': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const renderFriendsList = () => {
    // Online, idle, and dnd are all considered "online"
    const onlineFriends = friends.filter(friend => 
      friend.status === 'online' || 
      friend.status === 'idle' || 
      friend.status === 'dnd'
    );
    const displayFriends = activeTab === 'online' ? onlineFriends : friends;

    return (
      <div className="space-y-2">
        {displayFriends.map(friend => (
          <div key={friend.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg group">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {(friend.displayName || friend.username)[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${getStatusColor(friend.status)}`}></div>
              </div>
              <div>
                <div className="text-white font-medium">{friend.displayName || friend.username}</div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => handleStartConversation(friend)}
                className="p-2 bg-gray-800/80 hover:bg-blue-600 rounded-lg transition-all duration-200 hover:scale-110 shadow-lg hover:shadow-blue-500/50" 
                title="Mesaj Gönder"
              >
                <MessageCircle size={18} className="text-gray-300 hover:text-white transition-colors" />
              </button>
              <button 
                onClick={() => handleRemoveFriend(friend.id)}
                className="p-2 bg-gray-800/80 hover:bg-red-600 rounded-lg transition-all duration-200 hover:scale-110 shadow-lg hover:shadow-red-500/50"
                title="Arkadaşlıktan Çıkar"
              >
                <UserX size={18} className="text-gray-300 hover:text-white transition-colors" />
              </button>
              <button 
                onClick={() => handleBlockUser(friend.id)}
                className="p-2 bg-gray-800/80 hover:bg-red-600 rounded-lg transition-all duration-200 hover:scale-110 shadow-lg hover:shadow-red-500/50"
                title="Engelle"
              >
                <Shield size={18} className="text-gray-300 hover:text-white transition-colors" />
              </button>
            </div>
          </div>
        ))}
        {displayFriends.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p>{activeTab === 'online' ? 'Çevrimiçi ' : ''}arkadaş bulunamadı</p>
          </div>
        )}
      </div>
    );
  };

  const renderPendingRequests = () => (
    <div className="space-y-4">
      {/* Alınan İstekler */}
      {pendingRequests.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2 px-2">
            Gelen İstekler — {pendingRequests.length}
          </h3>
          <div className="space-y-2">
            {pendingRequests.map(request => (
              <div key={request.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg border border-green-500/20">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                      {(request.from.displayName || request.from.username)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-white font-medium">{request.from.displayName || request.from.username}</div>
                    {request.message && (
                      <div className="text-gray-300 text-sm mt-1">{request.message}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleAcceptRequest(request.id)}
                    className="p-2 bg-green-600 hover:bg-green-700 rounded-full transition-colors"
                    title="Kabul Et"
                  >
                    <Check size={16} className="text-white" />
                  </button>
                  <button 
                    onClick={() => handleDeclineRequest(request.id)}
                    className="p-2 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
                    title="Reddet"
                  >
                    <X size={16} className="text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gönderilen İstekler */}
      {sentRequests.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2 px-2">
            Gönderilen İstekler — {sentRequests.length}
          </h3>
          <div className="space-y-2">
            {sentRequests.map(request => (
              <div key={request.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg border border-yellow-500/20">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                      {(request.to.displayName || request.to.username)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-white font-medium">{request.to.displayName || request.to.username}</div>
                    <div className="mt-1.5 inline-flex items-center px-2.5 py-1 bg-yellow-500/20 border border-yellow-500/40 rounded-full">
                      <Clock size={12} className="mr-1.5 text-yellow-400 animate-pulse" />
                      <span className="text-yellow-400 text-xs font-medium">Bekliyor...</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeclineRequest(request.id)}
                  className="p-2 bg-gray-600 hover:bg-gray-700 rounded-full transition-colors"
                  title="İsteği Geri Çek"
                >
                  <X size={16} className="text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hiç istek yok */}
      {pendingRequests.length === 0 && sentRequests.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <UserCheck size={48} className="mx-auto mb-4 opacity-50" />
          <p>Bekleyen arkadaşlık isteği yok</p>
        </div>
      )}
    </div>
  );

  const renderBlockedUsers = () => (
    <div className="space-y-2">
      {blockedUsers.map(user => (
        <div key={user.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                {(user.displayName || user.username)[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-white font-medium">{user.displayName || user.username}</div>
            </div>
          </div>
          <button 
            onClick={() => handleUnblockUser(user.id)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white"
          >
            Engeli Kaldır
          </button>
        </div>
      ))}
      {blockedUsers.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Shield size={48} className="mx-auto mb-4 opacity-50" />
          <p>Engellenmiş kullanıcı yok</p>
        </div>
      )}
    </div>
  );

  const renderAddFriend = () => (
    <div className="space-y-4">
      <div className="bg-black/40 backdrop-blur-sm p-6 rounded-lg border border-white/10">
        <h3 className="text-white font-semibold text-lg mb-2">Arkadaş Ekle</h3>
        <p className="text-gray-400 text-sm mb-4">
          Kullanıcı adlarıyla arkadaş ekleyebilirsiniz.
        </p>
        <div className="flex space-x-2">
          <input
            type="text"
            value={addFriendQuery}
            onChange={(e) => setAddFriendQuery(e.target.value)}
            placeholder="Kullanıcı adı girin"
            className="flex-1 bg-gray-800/50 text-white px-4 py-3 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            onKeyPress={(e) => e.key === 'Enter' && handleSendFriendRequest(addFriendQuery)}
          />
          <button
            onClick={() => handleSendFriendRequest(addFriendQuery)}
            disabled={!addFriendQuery.trim()}
            className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg text-white transition-all shadow-lg disabled:shadow-none"
            title="Arkadaş Ekle"
          >
            <UserPlus size={20} />
          </button>
        </div>
      </div>

      <div>
        <div className="relative mb-4">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            placeholder="Kullanıcı ara..."
            className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                      {(user.displayName || user.username)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-white font-medium">{user.displayName || user.username}</div>
                  </div>
                </div>
                <div className="text-sm">
                  {user.relationshipStatus === 'friend' && (
                    <span className="text-green-400">Arkadaş</span>
                  )}
                  {user.relationshipStatus === 'request_sent' && (
                    <span className="text-yellow-400">İstek Gönderildi</span>
                  )}
                  {user.relationshipStatus === 'request_received' && (
                    <span className="text-blue-400">İstek Alındı</span>
                  )}
                  {user.relationshipStatus === 'blocked' && (
                    <span className="text-red-400">Engellendi</span>
                  )}
                  {user.relationshipStatus === 'none' && (
                    <button
                      onClick={() => handleSendFriendRequest(user.username)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white"
                    >
                      Arkadaş Ekle
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 bg-black/40 backdrop-blur-md">
        <div className="flex items-center space-x-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-400 hover:text-white" />
            </button>
          )}
          <Users size={24} className="text-gray-400" />
          <h2 className="text-white text-xl font-semibold">Arkadaşlar</h2>
        </div>
        
        {/* Tabs - Discord Style */}
        <div className="flex space-x-2 mt-4">
          <button
            onClick={() => setActiveTab('online')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === 'online' 
                ? 'bg-green-600/20 text-green-400 border-2 border-green-500/50 shadow-lg shadow-green-500/20' 
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/70 hover:text-white border-2 border-transparent'
            }`}
          >
            Çevrimiçi
            {friends.filter(f => f.status === 'online' || f.status === 'idle' || f.status === 'dnd').length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-green-500/30 text-green-300 text-xs rounded-full">
                {friends.filter(f => f.status === 'online' || f.status === 'idle' || f.status === 'dnd').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === 'all' 
                ? 'bg-blue-600/20 text-blue-400 border-2 border-blue-500/50 shadow-lg shadow-blue-500/20' 
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/70 hover:text-white border-2 border-transparent'
            }`}
          >
            Tümü
            {friends.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-blue-500/30 text-blue-300 text-xs rounded-full">
                {friends.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === 'pending' 
                ? 'bg-yellow-600/20 text-yellow-400 border-2 border-yellow-500/50 shadow-lg shadow-yellow-500/20' 
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/70 hover:text-white border-2 border-transparent'
            }`}
          >
            Bekleyen
            {(pendingRequests.length + sentRequests.length) > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-600 text-white text-xs rounded-full animate-pulse">
                {pendingRequests.length + sentRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('blocked')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === 'blocked' 
                ? 'bg-red-600/20 text-red-400 border-2 border-red-500/50 shadow-lg shadow-red-500/20' 
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/70 hover:text-white border-2 border-transparent'
            }`}
          >
            Engellenen
            {blockedUsers.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500/30 text-red-300 text-xs rounded-full">
                {blockedUsers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              activeTab === 'add' 
                ? 'bg-green-600 text-white border-2 border-green-500 shadow-lg shadow-green-500/30' 
                : 'bg-gray-800/50 text-green-400 hover:bg-green-600/20 hover:text-green-300 border-2 border-transparent hover:border-green-500/30'
            }`}
          >
            Arkadaş Ekle
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-600 text-white rounded-lg">
          {error}
          <button 
            onClick={() => setError('')}
            className="float-right"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400">Yükleniyor...</div>
          </div>
        ) : (
          <>
            {(activeTab === 'online' || activeTab === 'all') && renderFriendsList()}
            {activeTab === 'pending' && renderPendingRequests()}
            {activeTab === 'blocked' && renderBlockedUsers()}
            {activeTab === 'add' && renderAddFriend()}
          </>
        )}
      </div>
    </div>
  );
};

export default FriendsPanel;
