import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { 
  User, 
  MessageSquare, 
  UserPlus, 
  Crown, 
  Shield,
  Star,
  Calendar,
  Clock,
  Gamepad2,
  UserMinus,
  X
} from 'lucide-react';
import { dmAPI } from '../services/api';
import friendsAPI from '../services/friendsAPI';

export function UserProfileModal({ user, open, onOpenChange, currentUser, showMessageButton = true, showFriendButton = true }) {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [displayUser, setDisplayUser] = useState(user);

  const activities = [
    { id: 1, type: 'playing', game: 'Visual Studio Code', timestamp: '2 saat önce' },
    { id: 2, type: 'listening', music: 'Lo-fi Hip Hop', timestamp: '1 saat önce' },
    { id: 3, type: 'online', timestamp: 'Çevrimiçi' }
  ];

  const mutualFriends = [
    { id: 1, username: 'Alex', avatar: null },
    { id: 2, username: 'Sarah', avatar: null },
    { id: 3, username: 'Mike', avatar: null }
  ];

  useEffect(() => {
    if (user) {
      setDisplayUser(user);
    }
  }, [user]);

  const handleSendMessage = async () => {
    if (!displayUser || loading) return;
    
    setLoading(true);
    try {
      const response = await dmAPI.createConversation(displayUser.id);
      if (response.success) {
        onOpenChange(false);
      }
    } catch (error) {
      // Error handled silently or with toast if needed
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    if (!displayUser || loading) return;
    
    setLoading(true);
    try {
      const response = await friendsAPI.sendFriendRequest(displayUser.id);
      if (response.success) {
        // Friend request sent successfully
      }
    } catch (error) {
      // Error handled silently or with toast if needed
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    switch(role) {
      case 'Owner': return <Crown className="w-3 h-3 text-yellow-400" />;
      case 'Admin': return <Shield className="w-3 h-3 text-red-400" />;
      case 'Moderator': return <Star className="w-3 h-3 text-blue-400" />;
      default: return null;
    }
  };

  const getRoleBadgeColor = (role) => {
    switch(role) {
      case 'Owner': return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30';
      case 'Admin': return 'bg-red-600/20 text-red-400 border-red-600/30';
      case 'Moderator': return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
      default: return 'bg-gray-600/20 text-gray-400 border-gray-600/30';
    }
  };

  if (!displayUser) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-gray-900/95 backdrop-blur-xl border border-white/10 text-white p-0 overflow-hidden">
        <DialogTitle className="sr-only">
          {displayUser.username ? `${displayUser.username} Profili` : 'Kullanıcı Profili'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Kullanıcı profil bilgileri, durum ve etkileşim seçenekleri
        </DialogDescription>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 text-gray-400 hover:text-white bg-black/50 backdrop-blur-sm hover:bg-black/70"
          onClick={() => onOpenChange(false)}
        >
          <X className="w-4 h-4" />
        </Button>

        {/* Extended Banner - covers half of avatar */}
        <div className="h-36 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 relative">
          <div className="absolute inset-0 bg-black/20"></div>
        </div>

        {/* Profile Section with Centered Avatar */}
        <div className="p-4 space-y-4 -mt-16 relative">
          {/* Centered Avatar and Info */}
          <div className="flex flex-col items-center space-y-2">
            <Avatar className="w-32 h-32 border-4 border-gray-900">
              <AvatarImage src={null} alt={displayUser.username} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-3xl font-bold">
                {displayUser.username?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2">
                <h2 className="text-base font-bold text-white">
                  {displayUser.username || 'Bilinmeyen Kullanıcı'}
                </h2>
                {displayUser.role && getRoleIcon(displayUser.role)}
              </div>
              
              {displayUser.role && (
                <Badge className={`text-xs px-2 py-0.5 mt-1 ${getRoleBadgeColor(displayUser.role)}`}>
                  {displayUser.role}
                </Badge>
              )}
            </div>
          </div>

          {/* Action Buttons - Horizontal Layout */}
          {displayUser.id !== currentUser?.id && (
            <div className="flex space-x-2">
              {showFriendButton && (
                <Button 
                  onClick={handleAddFriend}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-gray-700/80 backdrop-blur-sm hover:bg-gray-700 text-white border border-gray-600/50 text-xs py-2"
                >
                  <UserPlus className="w-3 h-3 mr-1" />
                  Arkadaş Ekle
                </Button>
              )}
              
              {showMessageButton && (
                <Button 
                  onClick={handleSendMessage}
                  disabled={loading}
                  size="sm"
                  className="flex-1 bg-indigo-600/80 backdrop-blur-sm hover:bg-indigo-600 text-white border border-indigo-500/30 text-xs py-2"
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Mesaj
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Compact Tabs */}
        <div className="px-3 pb-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full bg-black/30 backdrop-blur-sm border border-white/10 h-8">
              <TabsTrigger 
                value="profile" 
                className="flex-1 text-xs data-[state=active]:bg-indigo-600/50 data-[state=active]:text-white text-gray-400 h-6"
              >
                Profil
              </TabsTrigger>
              <TabsTrigger 
                value="activity" 
                className="flex-1 text-xs data-[state=active]:bg-indigo-600/50 data-[state=active]:text-white text-gray-400 h-6"
              >
                Aktivite
              </TabsTrigger>
              <TabsTrigger 
                value="mutual" 
                className="flex-1 text-xs data-[state=active]:bg-indigo-600/50 data-[state=active]:text-white text-gray-400 h-6"
              >
                Arkadaş
              </TabsTrigger>
            </TabsList>

            <div className="mt-2">
              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-2">
                <div className="bg-white/5 backdrop-blur-sm rounded-md p-2 border border-white/10">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Katılma Tarihi</span>
                      <span className="text-xs text-white">15 Ocak 2024</span>
                    </div>
                  </div>
                </div>

                {displayUser.bio && (
                  <div className="bg-white/5 backdrop-blur-sm rounded-md p-2 border border-white/10">
                    <h3 className="text-xs font-semibold mb-1 text-white">Hakkında</h3>
                    <p className="text-xs text-gray-300 leading-relaxed">{displayUser.bio}</p>
                  </div>
                )}
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="space-y-2">
                <div className="bg-white/5 backdrop-blur-sm rounded-md p-2 border border-white/10">
                  <h3 className="text-xs font-semibold mb-2 text-white">Son Aktiviteler</h3>
                  <div className="space-y-1">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex items-center space-x-2 p-1.5 bg-white/5 rounded-md">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-xs">
                            {activity.type === 'playing' && `${activity.game} oynuyor`}
                            {activity.type === 'listening' && `${activity.music} dinliyor`}
                            {activity.type === 'online' && 'Çevrimiçi'}
                          </div>
                        </div>
                        <div className="text-gray-400 text-xs">{activity.timestamp}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm rounded-md p-2 border border-white/10">
                  <h3 className="text-xs font-semibold mb-2 text-white">Şu Anda Oynuyor</h3>
                  <div className="flex items-center space-x-2 p-1.5 bg-indigo-600/20 border border-indigo-500/30 rounded-md">
                    <Gamepad2 className="w-3 h-3 text-indigo-400" />
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-medium text-xs">Visual Studio Code</div>
                      <div className="text-indigo-300 text-xs truncate">Fluxy Geliştiriliyor</div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Mutual Friends Tab */}
              <TabsContent value="mutual" className="space-y-2">
                <div className="bg-white/5 backdrop-blur-sm rounded-md p-2 border border-white/10">
                  <h3 className="text-xs font-semibold mb-2 text-white">
                    Ortak Arkadaşlar ({mutualFriends.length})
                  </h3>
                  <div className="space-y-1">
                    {mutualFriends.map((friend) => (
                      <div key={friend.id} className="flex items-center space-x-2 p-1.5 bg-white/5 rounded-md hover:bg-white/10 transition-colors cursor-pointer">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={null} alt={friend.username} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                            {friend.username.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium text-xs">{friend.username}</div>
                          <div className="text-gray-400 text-xs">Ortak Arkadaş</div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white w-5 h-5 p-0">
                          <MessageSquare className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Admin Actions - Compact */}
        {currentUser?.role === "Admin" && displayUser.id !== currentUser.id && (
          <div className="px-3 py-2 border-t border-white/10 bg-black/50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Yönetici</span>
              <div className="flex space-x-1">
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-400/10 text-xs px-1.5 py-1 h-6"
                >
                  <UserMinus className="w-3 h-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10 text-xs px-1.5 py-1 h-6"
                >
                  <Shield className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};