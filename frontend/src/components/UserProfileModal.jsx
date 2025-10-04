import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { 
  MessageSquare, 
  UserPlus,
  UserCheck,
  Crown, 
  Edit3,
  Check,
  X,
  Users
} from 'lucide-react';
import { dmAPI, serverAPI } from '../services/api';
import friendsAPI from '../services/friendsAPI';
import socketService from '../services/socket';

export function UserProfileModal({ user, open, onOpenChange, currentUser, server, roles = [], showMessageButton = true, showFriendButton = true, onDirectMessageNavigation }) {
  const [loading, setLoading] = useState(false);
  const [displayUser, setDisplayUser] = useState(user);
  const [friendshipStatus, setFriendshipStatus] = useState('none');
  const [mutualFriends, setMutualFriends] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [serverStatus, setServerStatus] = useState('');
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [tempStatus, setTempStatus] = useState('');

  useEffect(() => {
    if (user && open) {
      setFriendshipStatus('none');
      setDisplayUser(user);
      loadUserData();
    }
  }, [user, open]);

  useEffect(() => {
    if (!open) {
      setFriendshipStatus('none');
      setIsEditingStatus(false);
    }
  }, [open]);

  // Listen for status updates and role changes from other users
  useEffect(() => {
    if (!open || !server || !user) return;

    const io = socketService.getSocket();
    if (!io) return;

    const handleStatusUpdate = ({ userId, serverId, status }) => {
      // Check if this update is for the currently viewed user in this server
      if ((userId === user.id || userId === user._id) && 
          (serverId === server._id || serverId === server.id)) {
        setServerStatus(status);
        // Also update localStorage
        const statusKey = `server_status_${serverId}_${userId}`;
        localStorage.setItem(statusKey, status);
      }
    };

    const handleRoleAssignment = ({ userId, serverId, roleId, action }) => {
      // Check if this update is for the currently viewed user in this server
      const viewedUserId = String(user.id || user._id);
      const updateUserId = String(userId);
      const currentServerId = String(server._id || server.id);
      const updateServerId = String(serverId);
      
      if (viewedUserId === updateUserId && currentServerId === updateServerId) {
        
        // Update displayUser roles
        setDisplayUser(prev => {
          if (!prev) return prev;
          const currentRoles = prev.roles || [];
          let updatedRoles;
          
          if (action === 'assigned') {
            // Prevent duplicates
            updatedRoles = currentRoles.includes(roleId) 
              ? currentRoles 
              : [...currentRoles, roleId];
          } else {
            updatedRoles = currentRoles.filter(r => r !== roleId);
          }
          
          return {
            ...prev,
            roles: updatedRoles
          };
        });
        
        // Reload user roles to update UI
        if (user.roles && roles.length > 0) {
          const currentUserRoles = user.roles || [];
          let updatedUserRoles;
          
          if (action === 'assigned') {
            // Prevent duplicates
            updatedUserRoles = currentUserRoles.includes(roleId) 
              ? currentUserRoles 
              : [...currentUserRoles, roleId];
          } else {
            updatedUserRoles = currentUserRoles.filter(r => r !== roleId);
          }
          
          const memberRoles = updatedUserRoles
            .map(roleId => roles.find(r => r._id === roleId))
            .filter(Boolean)
            .sort((a, b) => (b.position || 0) - (a.position || 0));
          
          setUserRoles(memberRoles);
        }
      }
    };

    io.on('userStatusUpdate', handleStatusUpdate);
    io.on('roleAssignment', handleRoleAssignment);

    return () => {
      io.off('userStatusUpdate', handleStatusUpdate);
      io.off('roleAssignment', handleRoleAssignment);
    };
  }, [open, server, user, roles]);

  const loadUserData = async () => {
    if (!user) return;
    
    try {
      // Load mutual friends - find common friends between current user and viewed user
      if (currentUser && (user.id !== currentUser.id && user._id !== currentUser._id)) {
        const friends = await friendsAPI.getFriends();
        // Filter out the viewed user from mutual friends
        const mutual = friends.filter(f => {
          const friendId = f.id || f._id;
          const viewedUserId = user.id || user._id;
          return friendId !== viewedUserId;
        }).slice(0, 5);
        setMutualFriends(mutual);
      } else {
        setMutualFriends([]);
      }
      
      // Load user roles
      if (user.roles && roles.length > 0) {
        const memberRoles = user.roles
          .map(roleId => roles.find(r => r._id === roleId))
          .filter(Boolean)
          .sort((a, b) => (b.position || 0) - (a.position || 0));
        setUserRoles(memberRoles);
      }
      
      // Check friendship status
      await checkFriendshipStatus();
      
      // Load server status (from localStorage for now)
      // In production, this should be stored in backend per server
      if (server && user.id === currentUser?.id) {
        const statusKey = `server_status_${server._id || server.id}_${user.id || user._id}`;
        const savedStatus = localStorage.getItem(statusKey) || '';
        setServerStatus(savedStatus);
        setTempStatus(savedStatus);
      } else if (server) {
        // Load other user's status
        const statusKey = `server_status_${server._id || server.id}_${user.id || user._id}`;
        const savedStatus = localStorage.getItem(statusKey) || '';
        setServerStatus(savedStatus);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const checkFriendshipStatus = async () => {
    if (!user || !user.username) return;
    
    try {
      const [friends, sentRequests, pendingRequests] = await Promise.all([
        friendsAPI.getFriends(),
        friendsAPI.getSentRequests(),
        friendsAPI.getPendingRequests()
      ]);

      const userId = user.id || user._id;
      
      if (friends.some(f => (f.id || f._id) === userId)) {
        setFriendshipStatus('friend');
        return;
      }

      if (sentRequests.some(r => (r.to?.id || r.to?._id) === userId)) {
        setFriendshipStatus('pending');
        return;
      }

      if (pendingRequests.some(r => (r.from?.id || r.from?._id) === userId)) {
        setFriendshipStatus('received');
        return;
      }

      setFriendshipStatus('none');
    } catch (error) {
      console.error('Error checking friendship status:', error);
      setFriendshipStatus('none');
    }
  };

  const handleSendMessage = async () => {
    if (!displayUser || loading) return;
    
    const userId = displayUser.id || displayUser._id;
    if (!userId) return;
    
    setLoading(true);
    try {
      const response = await dmAPI.createConversation(userId);
      
      if (response.success || response.conversation || response.data?.conversation) {
        onOpenChange(false);
        
        if (onDirectMessageNavigation) {
          onDirectMessageNavigation(userId);
        }
      }
    } catch (error) {
      console.error('Error in handleSendMessage:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!displayUser || loading) return;
    
    if (friendshipStatus === 'received') {
      setLoading(true);
      try {
        const pendingRequests = await friendsAPI.getPendingRequests();
        const userId = displayUser.id || displayUser._id;
        const request = pendingRequests.find(r => (r.from?.id || r.from?._id) === userId);
        
        if (request) {
          await friendsAPI.acceptFriendRequest(request.id);
          setFriendshipStatus('friend');
        }
      } catch (error) {
        console.error('Error accepting friend request:', error);
      } finally {
        setLoading(false);
      }
      return;
    }
    
    const username = displayUser.username;
    if (!username) return;
    
    setLoading(true);
    try {
      const response = await friendsAPI.sendFriendRequest(username);
      if (response && response.request) {
        setFriendshipStatus('pending');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStatus = () => {
    if (server) {
      const statusKey = `server_status_${server._id || server.id}_${user.id || user._id}`;
      localStorage.setItem(statusKey, tempStatus);
      setServerStatus(tempStatus);
      setIsEditingStatus(false);
      
      // Broadcast status change to other users via socket
      const io = socketService.getSocket();
      if (io) {
        io.emit('userStatusUpdate', {
          userId: user.id || user._id,
          serverId: server._id || server.id,
          status: tempStatus
        });
      }
    }
  };

  if (!displayUser) return null;

  const isOwner = server && (displayUser.id === server.owner || displayUser._id === server.owner);
  
  // Fix: Properly compare user IDs
  const displayUserId = String(displayUser.id || displayUser._id);
  const currentUserId = String(currentUser?.id || currentUser?._id);
  const isOwnProfile = displayUserId === currentUserId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[340px] bg-[#232428] border-none text-white p-0 overflow-hidden rounded-xl">
        <DialogTitle className="sr-only">
          {displayUser.username ? `${displayUser.username} Profili` : 'Kullanıcı Profili'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Kullanıcı profil bilgileri ve etkileşim seçenekleri
        </DialogDescription>

        {/* Banner */}
        <div className="h-[100px] bg-gradient-to-r from-[#5865F2] via-[#5865F2] to-[#5865F2] relative">
        </div>

        {/* Profile Content */}
        <div className="px-4 pb-4 -mt-14">
          {/* Avatar */}
          <div className="relative w-20 h-20 mb-3">
            <Avatar className="w-20 h-20 border-[6px] border-[#232428]">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl font-bold">
                {displayUser.displayName?.charAt(0) || displayUser.username?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            {isOwner && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#232428] rounded-full flex items-center justify-center">
                <Crown className="w-4 h-4 text-yellow-400" />
              </div>
            )}
          </div>

          {/* Server Status - Only show for current user or if other user has status */}
          {server && isOwnProfile && (
            <div className="mb-3">
              {isEditingStatus ? (
                <div className="space-y-2">
                  <Input
                    value={tempStatus}
                    onChange={(e) => setTempStatus(e.target.value)}
                    placeholder="Sunucudaki durumunu belirle..."
                    className="bg-[#1e1f22] border-white/10 text-white text-sm h-9"
                    maxLength={128}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSaveStatus}
                      className="flex-1 bg-[#5865F2] hover:bg-[#4752C4] h-7 text-xs"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Kaydet
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTempStatus(serverStatus);
                        setIsEditingStatus(false);
                      }}
                      className="flex-1 bg-[#2b2d31] border-white/10 hover:bg-[#35373c] h-7 text-xs"
                    >
                      İptal
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => setIsEditingStatus(true)}
                  className="bg-[#2b2d31] rounded-lg p-3 border border-white/5 cursor-pointer hover:bg-[#35373c] transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">💬</span>
                    <div className="flex-1">
                      <p className="text-sm text-white font-medium">
                        {serverStatus || 'Durum yazısı ekle...'}
                      </p>
                    </div>
                    <Edit3 className="w-3 h-3 text-gray-400" />
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Other user's status - view only */}
          {server && !isOwnProfile && serverStatus && (
            <div className="mb-3">
              <div className="bg-[#2b2d31] rounded-lg p-3 border border-white/5">
                <div className="flex items-start gap-2">
                  <span className="text-lg">💬</span>
                  <div className="flex-1">
                    <p className="text-sm text-white font-medium">{serverStatus}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Username */}
          <div className="mb-3">
            <h2 className="text-xl font-bold text-white">
              {displayUser.displayName || displayUser.username}
            </h2>
            <p className="text-sm text-gray-400">
              {displayUser.username}
              {displayUser.discriminator && ` • ${displayUser.discriminator}`}
            </p>
          </div>


          {/* Roles Section - Discord-like badges */}
          {userRoles.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Roller</h3>
              <div className="flex flex-wrap gap-2">
                {userRoles.map((role) => (
                  <Badge 
                    key={role._id}
                    className="text-xs px-3 py-1 border font-medium"
                    style={{ 
                      backgroundColor: `${role.color}20`,
                      borderColor: role.color,
                      color: role.color
                    }}
                  >
                    <div 
                      className="w-2 h-2 rounded-full mr-1.5 inline-block"
                      style={{ backgroundColor: role.color }}
                    />
                    {role.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Mutual Friends */}
          {mutualFriends.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2 flex items-center gap-2">
                <Users className="w-3 h-3" />
                Ortak Arkadaşlar — {mutualFriends.length}
              </h3>
              <div className="space-y-1">
                {mutualFriends.map((friend) => (
                  <div 
                    key={friend.id || friend._id}
                    className="flex items-center gap-2 p-2 bg-[#2b2d31] rounded hover:bg-[#35373c] transition-colors cursor-pointer"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                        {(friend.displayName || friend.username)?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-white">{friend.displayName || friend.username}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons - Outside card, at bottom */}
          {!isOwnProfile && (
            <div className="flex gap-2 pt-2 border-t border-white/10">
              {showFriendButton && (
                <Button 
                  onClick={handleAddFriend}
                  disabled={loading || friendshipStatus === 'pending' || friendshipStatus === 'friend'}
                  className={`flex-1 h-9 text-sm font-medium ${
                    friendshipStatus === 'friend'
                      ? 'bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/50'
                      : friendshipStatus === 'pending'
                      ? 'bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-500/50'
                      : 'bg-[#2b2d31] hover:bg-[#35373c] text-white border border-white/10'
                  }`}
                >
                  {friendshipStatus === 'friend' || friendshipStatus === 'pending' ? (
                    <>
                      <UserCheck className="w-4 h-4 mr-2" />
                      {friendshipStatus === 'friend' ? 'Arkadaş' : 'Beklemede'}
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Arkadaş Ekle
                    </>
                  )}
                </Button>
              )}
              
              {showMessageButton && (
                <Button 
                  onClick={handleSendMessage}
                  disabled={loading}
                  className="flex-1 bg-[#5865F2] hover:bg-[#4752C4] text-white h-9 text-sm font-medium"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Mesaj Gönder
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
