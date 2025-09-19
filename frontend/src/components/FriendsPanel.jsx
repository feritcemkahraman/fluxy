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
  ArrowLeft
} from 'lucide-react';
import friendsAPI from '../services/friendsAPI';
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

const FriendsPanel = ({ onBack }) => {
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

  const loadFriendsData = async () => {
    try {
      setLoading(true);
      const [friendsData, pendingData, sentData, blockedData] = await Promise.all([
        friendsAPI.getFriends(),
        friendsAPI.getPendingRequests(),
        friendsAPI.getSentRequests(),
        friendsAPI.getBlockedUsers()
      ]);

      setFriends(friendsData);
      setPendingRequests(pendingData);
      setSentRequests(sentData);
      setBlockedUsers(blockedData);
    } catch (error) {
      setError('Failed to load friends data');
      // console.error('Load friends data error:', error);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'dnd': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const renderFriendsList = () => {
    const onlineFriends = friends.filter(friend => friend.status === 'online');
    const displayFriends = activeTab === 'online' ? onlineFriends : friends;

    return (
      <div className="space-y-2">
        {displayFriends.map(friend => (
          <div key={friend.id} className="flex items-center justify-between p-3 hover:bg-gray-700 rounded-lg group">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={null} alt={friend.displayName || friend.username} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {(friend.displayName || friend.username)[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${getStatusColor(friend.status)}`}></div>
              </div>
              <div>
                <div className="text-white font-medium">{friend.displayName || friend.username}</div>
                <div className="text-gray-400 text-sm">#{friend.discriminator}</div>
              </div>
            </div>
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-1 hover:bg-gray-600 rounded">
                <MessageCircle size={16} className="text-gray-400" />
              </button>
              <button 
                onClick={() => handleRemoveFriend(friend.id)}
                className="p-1 hover:bg-red-600 rounded"
              >
                <UserX size={16} className="text-gray-400" />
              </button>
              <button 
                onClick={() => handleBlockUser(friend.id)}
                className="p-1 hover:bg-red-600 rounded"
              >
                <Shield size={16} className="text-gray-400" />
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
    <div className="space-y-2">
      {pendingRequests.map(request => (
        <div key={request.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={null} alt={request.from.displayName || request.from.username} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                {(request.from.displayName || request.from.username)[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-white font-medium">{request.from.displayName || request.from.username}</div>
              <div className="text-gray-400 text-sm">#{request.from.discriminator}</div>
              {request.message && (
                <div className="text-gray-300 text-sm mt-1">{request.message}</div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => handleAcceptRequest(request.id)}
              className="p-2 bg-green-600 hover:bg-green-700 rounded-full"
            >
              <Check size={16} className="text-white" />
            </button>
            <button 
              onClick={() => handleDeclineRequest(request.id)}
              className="p-2 bg-red-600 hover:bg-red-700 rounded-full"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>
      ))}
      {pendingRequests.length === 0 && (
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
              <AvatarImage src={null} alt={user.displayName || user.username} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                {(user.displayName || user.username)[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-white font-medium">{user.displayName || user.username}</div>
              <div className="text-gray-400 text-sm">#{user.discriminator}</div>
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
      <div className="bg-blue-600 p-4 rounded-lg">
        <h3 className="text-white font-medium mb-2">Arkadaş Ekle</h3>
        <p className="text-blue-100 text-sm mb-4">
          Kullanıcı adlarıyla arkadaş ekleyebilirsiniz.
        </p>
        <div className="flex space-x-2">
          <input
            type="text"
            value={addFriendQuery}
            onChange={(e) => setAddFriendQuery(e.target.value)}
            placeholder="Kullanıcı adı girin"
            className="flex-1 bg-gray-700 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && handleSendFriendRequest(addFriendQuery)}
          />
          <button
            onClick={() => handleSendFriendRequest(addFriendQuery)}
            disabled={!addFriendQuery.trim()}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white"
          >
            <Send size={16} />
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
                    <AvatarImage src={null} alt={user.displayName || user.username} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                      {(user.displayName || user.username)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-white font-medium">{user.displayName || user.username}</div>
                    <div className="text-gray-400 text-sm">#{user.discriminator}</div>
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
        
        {/* Tabs */}
        <div className="flex space-x-4 mt-4">
          <button
            onClick={() => setActiveTab('online')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              activeTab === 'online' 
                ? 'bg-gray-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Çevrimiçi
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              activeTab === 'all' 
                ? 'bg-gray-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Tümü
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              activeTab === 'pending' 
                ? 'bg-gray-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Bekleyen {pendingRequests.length > 0 && (
              <span className="ml-1 px-2 py-1 bg-red-600 text-xs rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('blocked')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              activeTab === 'blocked' 
                ? 'bg-gray-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Engellenen
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-3 py-1 rounded text-sm font-medium ${
              activeTab === 'add' 
                ? 'bg-green-600 text-white' 
                : 'text-green-400 hover:text-white'
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
