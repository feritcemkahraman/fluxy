import React, { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { authAPI, profileAPI } from '../services/api';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Mic, MicOff, Headphones, Settings, LogOut, User, Palette, PhoneOff, Volume2, X, Smile } from 'lucide-react';
import StatusIndicator from './StatusIndicator';
import UserSettingsModal from './UserSettingsModal';
import { useAuth } from '../context/AuthContext';
import { useVoiceChat } from '../hooks/useVoiceChat';
import { useAudio } from '../hooks/useAudio';

const UserPanel = ({ user, server, servers }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCustomStatusModal, setShowCustomStatusModal] = useState(false);
  const [customStatusText, setCustomStatusText] = useState('');
  const [customStatusEmoji, setCustomStatusEmoji] = useState('');
  const { logout, updateStatus: updateAuthStatus, updateCustomStatus, updateUser } = useAuth();
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  // Voice chat hooks
  const {
    isConnected,
    currentChannel,
    isMuted: voiceMuted,
    isDeafened: voiceDeafened,
    leaveChannel,
    toggleMute,
    toggleDeafen
  } = useVoiceChat();
  
  const { playVoiceLeave } = useAudio();

  // Check if user is server owner
  const isServerOwner = server && user && (server.owner === user.id || server.owner === user._id);

  // Get user initials for avatar fallback
  const getUserInitials = (username) => {
    if (!username) return 'U';
    return username.split(' ').map(name => name[0]).join('').toUpperCase().slice(0, 2);
  };

  // Get formatted custom status
  const getCustomStatus = () => {
    if (!user?.customStatus) return null;

    // Handle both string and object formats
    if (typeof user.customStatus === 'string') {
      return user.customStatus;
    }

    // Handle object format {text, emoji, expiresAt}
    if (typeof user.customStatus === 'object' && user.customStatus.text) {
      const emoji = user.customStatus.emoji ? `${user.customStatus.emoji} ` : '';
      return `${emoji}${user.customStatus.text}`;
    }

    return null;
  };

  // Get status label in Turkish
  const getStatusLabel = (status) => {
    const statusLabels = {
      'online': 'Çevrimiçi',
      'idle': 'Boşta',
      'dnd': 'Rahatsız Etmeyin',
      'invisible': 'Görünmez',
      'offline': 'Çevrimdışı'
    };
    return statusLabels[status] || 'Çevrimiçi';
  };

  const handleMicToggle = () => {
    if (isConnected) {
      toggleMute();
    } else {
      setIsMuted(!isMuted);
    }
  };

  const handleDeafenToggle = () => {
    if (isConnected) {
      toggleDeafen();
    } else {
      setIsDeafened(!isDeafened);
      // If deafened, also mute
      if (!isDeafened) {
        setIsMuted(true);
      }
    }
  };

  const handleUserUpdate = (updatedUser) => {
    if (updatedUser) {
      // AuthContext'teki user state'ini güncelle
      updateUser(updatedUser);
    }
  };

  const handleStatusChange = async (status) => {
    try {
      setShowDropdown(false);
      
      // Update status via AuthContext (includes API call and real-time socket broadcast)
      const result = await updateAuthStatus({ status });
      
      if (!result.success) {
        console.error('Error updating status:', result.error);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleCustomStatusSave = async () => {
    try {
      const result = await updateCustomStatus({
        text: customStatusText,
        emoji: customStatusEmoji,
        expiresAt: null
      });
      
      // Always close modal - even if there's an error, user should see the result
      setShowCustomStatusModal(false);
      
      if (result.success) {
        // Success - clear form
        setCustomStatusText('');
        setCustomStatusEmoji('');
      } else {
        console.error('Error updating custom status:', result.error);
        // TODO: Show error toast to user
      }
    } catch (error) {
      console.error('Error updating custom status:', error);
      setShowCustomStatusModal(false); // Close modal even on error
    }
  };

  const handleClearCustomStatus = async () => {
    try {
      await updateCustomStatus({ text: '', emoji: '', expiresAt: null });
      setShowCustomStatusModal(false);
      setCustomStatusText('');
      setCustomStatusEmoji('');
    } catch (error) {
      console.error('Error clearing custom status:', error);
    }
  };

  // Load current custom status when modal opens
  useEffect(() => {
    if (showCustomStatusModal && user?.customStatus) {
      if (typeof user.customStatus === 'string') {
        setCustomStatusText(user.customStatus);
      } else if (typeof user.customStatus === 'object') {
        setCustomStatusText(user.customStatus.text || '');
        setCustomStatusEmoji(user.customStatus.emoji || '');
      }
    }
  }, [showCustomStatusModal, user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
          triggerRef.current && !triggerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const handleLeaveVoiceChannel = async () => {
    try {
      await leaveChannel();
      await playVoiceLeave();
    } catch (error) {
      // Error handled silently
    }
  };

  // Get current channel name for display - search across all servers
  const getCurrentChannelName = () => {
    if (!currentChannel) return null;
    
    // First try current server (for performance)
    if (server?.channels) {
      const channel = server.channels.find(c => (c._id || c.id) === currentChannel);
      if (channel) return channel.name;
    }
    
    // If not found in current server, search all servers
    if (servers && servers.length > 0) {
      for (const srv of servers) {
        if (srv.channels) {
          const channel = srv.channels.find(c => (c._id || c.id) === currentChannel);
          if (channel) {
            return `${channel.name} (${srv.name})`;
          }
        }
      }
    }
    
    return 'Bilinmeyen Kanal';
  };

  if (!user) return null;

  return (
    <>
      <div className="fixed bg-gray-900/95 backdrop-blur-sm border-t border-gray-700/50 z-50 rounded-lg shadow-lg" style={{ 
        bottom: '8px', 
        left: '14px', 
        width: '358px',
        boxShadow: `
          0 0 10px rgba(255, 255, 255, 0.3),
          0 0 20px rgba(255, 255, 255, 0.2),
          0 0 30px rgba(255, 255, 255, 0.1),
          0 0 40px rgba(255, 255, 255, 0.05),
          inset 0 0 10px rgba(255, 255, 255, 0.1)
        `
      }}>
        {/* Voice Connection Bar - Show when connected to voice channel */}
        {isConnected && currentChannel && (
          <div className="bg-green-600/20 border-b border-green-500/30 px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <Volume2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-green-300 text-sm font-medium">Ses Kanalında</div>
                  <div className="text-green-400/80 text-xs truncate">{getCurrentChannelName()}</div>
                </div>
              </div>
              <div className="mr-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 p-0 text-red-400 hover:text-white hover:bg-red-600/40"
                  onClick={handleLeaveVoiceChannel}
                >
                  <PhoneOff className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-3 py-5">
          {/* User Info Section */}
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <div className="min-w-0 flex-1 relative">
              <div 
                ref={triggerRef}
                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-700/30 rounded px-2 py-2 mr-2"
                onClick={toggleDropdown}
              >
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-lg">
                      {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 -right-0.5">
                    <StatusIndicator status={user?.status || 'online'} size="small" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold truncate text-base">
                    {user?.displayName || user?.username || 'Yükleniyor...'}
                  </div>
                  <div className="text-xs text-gray-400 truncate capitalize">
                    {user?.status === 'online' && 'Çevrimiçi'}
                    {user?.status === 'idle' && 'Boşta'}
                    {user?.status === 'dnd' && 'Rahatsız Etmeyin'}
                    {user?.status === 'invisible' && 'Görünmez'}
                    {!user?.status && 'Çevrimdışı'}
                  </div>
                </div>
              </div>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div
                  ref={dropdownRef}
                  className="absolute bottom-full left-0 mb-2 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50"
                >
                  {/* User Info Header */}
                  <div className="p-4 border-b border-gray-700">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                          {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold truncate">{user?.displayName || user?.username || 'Yükleniyor...'}</div>
                      </div>
                      <StatusIndicator status={user?.status || 'online'} size="small" />
                    </div>
                  </div>

                  {/* Status Section */}
                  <div className="p-3 border-b border-gray-700">
                    <div className="text-xs text-gray-400 mb-2 font-medium">DURUM</div>
                    <div className="space-y-1">
                      {[
                        { status: 'online', color: 'bg-green-500', label: 'Çevrimiçi', textColor: 'text-green-400' },
                        { status: 'idle', color: 'bg-yellow-500', label: 'Boşta', textColor: 'text-yellow-400' },
                        { status: 'dnd', color: 'bg-red-500', label: 'Rahatsız Etmeyin', textColor: 'text-red-400' },
                        { status: 'invisible', color: 'bg-gray-500', label: 'Görünmez', textColor: 'text-gray-400' }
                      ].map((item) => (
                        <div
                          key={item.status}
                          className={`flex items-center px-2 py-2 rounded cursor-pointer hover:bg-gray-700/50 ${
                            (user?.status || 'online') === item.status ? 'bg-gray-700/30' : ''
                          }`}
                          onClick={() => handleStatusChange(item.status)}
                        >
                          <div className={`w-3 h-3 ${item.color} rounded-full mr-3`}></div>
                          <span className={`text-sm ${(user?.status || 'online') === item.status ? item.textColor : 'text-gray-300'}`}>
                            {item.label}
                          </span>
                          {(user?.status || 'online') === item.status && (
                            <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="p-2">
                    <div
                      className="flex items-center px-3 py-2 rounded cursor-pointer hover:bg-gray-700/50 text-gray-300 hover:text-white"
                      onClick={() => {
                        setShowCustomStatusModal(true);
                        setShowDropdown(false);
                      }}
                    >
                      <Smile size={16} className="mr-3" />
                      <span className="text-sm">Durum Ekle</span>
                    </div>

                    <div
                      className="flex items-center px-3 py-2 rounded cursor-pointer hover:bg-gray-700/50 text-gray-300 hover:text-white"
                      onClick={() => {
                        setShowSettings(true);
                        setShowDropdown(false);
                      }}
                    >
                      <User size={16} className="mr-3" />
                      <span className="text-sm">Profil</span>
                    </div>
                    
                    <div
                      className="flex items-center px-3 py-2 rounded cursor-pointer hover:bg-gray-700/50 text-gray-300 hover:text-white"
                      onClick={() => {
                        setShowSettings(true);
                        setShowDropdown(false);
                      }}
                    >
                      <Settings size={16} className="mr-3" />
                      <span className="text-sm">Ayarlar</span>
                    </div>

                    <div
                      className="flex items-center px-3 py-2 rounded cursor-pointer hover:bg-gray-700/50 text-gray-300 hover:text-white"
                      onClick={() => setShowDropdown(false)}
                    >
                      <Palette size={16} className="mr-3" />
                      <span className="text-sm">Tema</span>
                    </div>

                    <div className="h-px bg-gray-700 my-2"></div>

                    <div
                      className="flex items-center px-3 py-2 rounded cursor-pointer hover:bg-red-900/20 text-red-400 hover:text-red-300"
                      onClick={() => {
                        logout();
                        setShowDropdown(false);
                      }}
                    >
                      <LogOut size={16} className="mr-3" />
                      <span className="text-sm">Çıkış Yap</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center space-x-3">
            {/* Microphone Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`w-8 h-8 p-0 bg-gray-600/20 hover:bg-gray-700/50 ${
                      (isConnected ? voiceMuted : isMuted) ? 'text-red-400 hover:text-red-300' : 'text-gray-300 hover:text-white'
                    }`}
                    onClick={handleMicToggle}
                  >
                    {(isConnected ? voiceMuted : isMuted) ? <MicOff size={16} /> : <Mic size={16} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{(isConnected ? voiceMuted : isMuted) ? 'Sesi Aç' : 'Sessiz'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Headphones Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`w-8 h-8 p-0 bg-gray-600/20 hover:bg-gray-700/50 ${
                      (isConnected ? voiceDeafened : isDeafened) ? 'text-red-400 hover:text-red-300' : 'text-gray-300 hover:text-white'
                    }`}
                    onClick={handleDeafenToggle}
                  >
                    <Headphones size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{(isConnected ? voiceDeafened : isDeafened) ? 'Sesi Etkinleştir' : 'Sağırlaştır'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Settings Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0 bg-gray-600/20 text-gray-300 hover:text-white hover:bg-gray-700/50"
                    onClick={() => setShowSettings(true)}
                  >
                    <Settings size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>User Settings</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* User Settings Modal */}
      {showSettings && (
        <UserSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          user={user}
          onUserUpdate={handleUserUpdate}
        />
      )}

      {/* Custom Status Modal */}
      {showCustomStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg w-full max-w-md p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Durum Ekle</h2>
              <button
                onClick={() => setShowCustomStatusModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Emoji (isteğe bağlı)
                </label>
                <Input
                  value={customStatusEmoji}
                  onChange={(e) => setCustomStatusEmoji(e.target.value)}
                  placeholder="😀"
                  maxLength={2}
                  className="bg-gray-900 border-gray-700 text-white placeholder:opacity-40"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Durum Yazısı
                </label>
                <Input
                  value={customStatusText}
                  onChange={(e) => setCustomStatusText(e.target.value)}
                  placeholder="Kodlama yapıyorum..."
                  maxLength={128}
                  className="bg-gray-900 border-gray-700 text-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {customStatusText.length}/128
                </p>
              </div>

              <div className="flex space-x-3 mt-6">
                <Button
                  onClick={handleCustomStatusSave}
                  disabled={!customStatusText && !customStatusEmoji}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Kaydet
                </Button>
                {(user?.customStatus?.text || user?.customStatus?.emoji) && (
                  <Button
                    onClick={handleClearCustomStatus}
                    variant="outline"
                    className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Temizle
                  </Button>
                )}
                <Button
                  onClick={() => setShowCustomStatusModal(false)}
                  variant="ghost"
                  className="flex-1 text-gray-300 hover:bg-gray-700"
                >
                  İptal
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserPanel;
