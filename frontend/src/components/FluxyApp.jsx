import React, { useState, useEffect, useCallback } from "react";
import ServerSidebar from "./ServerSidebar";
import ChannelSidebar from "./ChannelSidebar";
import ChatArea from "./ChatArea";
import MemberList from "./MemberList";
import UserPanel from "./UserPanel";
import DirectMessages from "./DirectMessages";
import VoiceScreen from "./VoiceScreen";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import { voiceChatService } from "../services/voiceChat";
import { useVoiceChat } from "../hooks/useVoiceChat";
import { serverAPI } from "../services/api";
import { toast } from "sonner";

const FluxyApp = () => {
  const { user, isAuthenticated } = useAuth();
  const { isConnected, on } = useSocket();
  const { 
    isConnected: isVoiceConnected, 
    currentChannel: currentVoiceChannel,
    connectedUsers,
    joinChannel: joinVoiceChannel,
    leaveChannel: leaveVoiceChannel
  } = useVoiceChat();
  
  const [servers, setServers] = useState([]);
  const [activeServer, setActiveServer] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [showMemberList, setShowMemberList] = useState(true);
  const [isDirectMessages, setIsDirectMessages] = useState(false);
  const [loading, setLoading] = useState(true);
  const [voiceChannelUsers, setVoiceChannelUsers] = useState({});
  const [showVoiceScreen, setShowVoiceScreen] = useState(false);

  // Track active voice channel for UI - only set when explicitly opened via 2nd click
  // Don't automatically show voice panel just because user is connected

  // Update voice channel users
  useEffect(() => {
    const updateVoiceUsers = () => {
      const status = voiceChatService.getStatus();
      setVoiceChannelUsers({
        [status.currentChannel]: status.connectedUsers,
        currentChannel: status.currentChannel
      });
    };

    // Initial update
    updateVoiceUsers();

    // Listen for voice chat events
    voiceChatService.on('connected', updateVoiceUsers);
    voiceChatService.on('disconnected', updateVoiceUsers);
    voiceChatService.on('user-joined', updateVoiceUsers);
    voiceChatService.on('user-left', updateVoiceUsers);

    return () => {
      voiceChatService.off('connected', updateVoiceUsers);
      voiceChatService.off('disconnected', updateVoiceUsers);
      voiceChatService.off('user-joined', updateVoiceUsers);
      voiceChatService.off('user-left', updateVoiceUsers);
    };
  }, []);

  // Load server members when activeServer changes
  useEffect(() => {
    const loadServerMembers = async () => {
      if (activeServer?._id || activeServer?.id) {
        try {
          const serverId = activeServer._id || activeServer.id;
          const response = await serverAPI.getServerMembers(serverId);
          
          // Update activeServer with members
          const updatedServer = {
            ...activeServer,
            members: response.data.members
          };
          
          setActiveServer(updatedServer);
          setServers(prev => prev.map(s => 
            (s._id || s.id) === serverId ? updatedServer : s
          ));
          
        } catch (error) {
          // Error loading server members handled silently
        }
      }
    };

    loadServerMembers();
  }, [activeServer?._id, activeServer?.id]); // Only depend on server ID

  // Update voice channel users
  useEffect(() => {
    const updateVoiceUsers = () => {
      const status = voiceChatService.getStatus();

      if (status.currentChannel) {
        // Add current user to connected users if not already included
        let connectedUsers = [...status.connectedUsers];
        
        const userId = user?.id || user?._id;
        if (userId && !connectedUsers.includes(userId)) {
          connectedUsers = [userId, ...connectedUsers];
        }

        setVoiceChannelUsers({
          [status.currentChannel]: connectedUsers,
          currentChannel: status.currentChannel
        });
      } else {
        setVoiceChannelUsers({});
      }
    };

    // Set current user ID in voiceChatService BEFORE update
    const userId = user?.id || user?._id;
    if (userId && voiceChatService.currentUserId !== userId) {
      if (voiceChatService.setCurrentUserId) {
        voiceChatService.setCurrentUserId(userId);
      } else {
        voiceChatService.currentUserId = userId;
      }
    }

    // Initial update
    updateVoiceUsers();

    // Listen for voice chat events
    voiceChatService.on('connected', updateVoiceUsers);
    voiceChatService.on('disconnected', updateVoiceUsers);
    voiceChatService.on('user-joined', updateVoiceUsers);
    voiceChatService.on('user-left', updateVoiceUsers);

    return () => {
      voiceChatService.off('connected', updateVoiceUsers);
      voiceChatService.off('disconnected', updateVoiceUsers);
      voiceChatService.off('user-joined', updateVoiceUsers);
      voiceChatService.off('user-left', updateVoiceUsers);
    };
  }, [user]);

  // Load user's servers on component mount - only once
  useEffect(() => {
    let isMounted = true;

    const loadServersOnce = async () => {
      if (!isMounted) return;

      try {
        const response = await serverAPI.getServers();
        
        if (!isMounted) return;
        
        setServers(response.data.servers || []);

        // Set first server as active if exists
        if (response.data.servers && response.data.servers.length > 0) {
          const firstServer = response.data.servers[0];
          setActiveServer(firstServer);
          
          // Find first text channel instead of just first channel
          if (firstServer.channels && firstServer.channels.length > 0) {
            const firstTextChannel = firstServer.channels.find(channel => channel.type === 'text') || firstServer.channels[0];
            setActiveChannel(firstTextChannel);
          }
          
          // Server join handled automatically by Socket.IO authentication
        }
      } catch (error) {
        if (!isMounted) return;

        if (error.response?.status === 401) {
          toast.error('Authentication expired. Please login again.');
          // Clear invalid token
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // Redirect to login
          window.location.href = '/';
        } else if (error.message === 'Network Error') {
          toast.error('Cannot connect to server. Backend may not be running.');
        } else {
          toast.error(`Failed to load servers: ${error.response?.data?.message || error.message}`);
        }

        // No fallback - user should create or join servers
        setServers([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadServersOnce();

    return () => {
      isMounted = false;
    };
  }, []); // No dependencies needed - only runs once on mount

  // Socket event listeners - more stable with useCallback
  useEffect(() => {
    const handleUserStatusUpdate = (data) => {
      // Update user status in UI - silent
    };

    const handleVoiceChannelUpdate = (data) => {
      // Update voice channel state - silent
    };

    const handleServerCreated = (data) => {
      console.log('Server created event received:', data);
      if (data.server) {
        setServers(prev => {
          // Check if server already exists to avoid duplicates
          const exists = prev.some(s => (s._id || s.id) === (data.server._id || data.server.id));
          if (!exists) {
            return [...prev, data.server];
          }
          return prev;
        });
        
        // Auto-select the new server
        setActiveServer(data.server);
        if (data.server.channels && data.server.channels.length > 0) {
          const firstChannel = data.server.channels.find(c => c.type === 'text') || data.server.channels[0];
          setActiveChannel(firstChannel);
        }
        setIsDirectMessages(false);
      }
    };

    const unsubscribeUserStatus = on('userStatusUpdate', handleUserStatusUpdate);
    const unsubscribeVoiceUpdate = on('voiceChannelUpdate', handleVoiceChannelUpdate);
    const unsubscribeServerCreated = on('serverCreated', handleServerCreated);

    return () => {
      unsubscribeUserStatus();
      unsubscribeVoiceUpdate();
      unsubscribeServerCreated();
    };
  }, [on]); // on is stable from useSocket hook

  const handleServerSelect = (server) => {
    if (server === "home") {
      setIsDirectMessages(true);
      setActiveServer(null);
      setActiveChannel(null);
      setShowVoiceScreen(false); // Hide voice screen when going to DMs
    } else {
      setIsDirectMessages(false);

      // Leave previous server - handled automatically by Socket.IO
      if (activeServer && activeServer._id) {
        // Socket.IO handles server switching automatically
      }

      setActiveServer(server);
      setShowVoiceScreen(false); // Hide voice screen when switching servers

      // Find first text channel instead of just first channel
      if (server.channels && server.channels.length > 0) {
        const firstTextChannel = server.channels.find(channel => channel.type === 'text') || server.channels[0];
        setActiveChannel(firstTextChannel);
      }

      // Server joined automatically by Socket.IO
      if (server._id) {
        // Socket.IO handles server connection automatically
      }
    }
  };

  const handleChannelSelect = (channel) => {
    // Special handling for voice channels
    if (channel.type === 'voice') {
      const channelId = channel._id || channel.id;

      // Set current user ID in voiceChatService BEFORE joining
      const userId = user?.id || user?._id;
      if (userId && voiceChatService.currentUserId !== userId) {
        if (voiceChatService.setCurrentUserId) {
          voiceChatService.setCurrentUserId(userId);
        } else {
          voiceChatService.currentUserId = userId;
        }
      }

      const status = voiceChatService.getStatus();
      const isAlreadyConnected = status.isConnected && status.currentChannel === channelId;

      if (isAlreadyConnected) {
        // If already connected to this channel, toggle panel
        setShowVoiceScreen(prev => !prev);
      } else {
        // Connect to voice channel (first click)
        joinVoiceChannel(channelId).catch(error => {
          toast.error(`Ses kanalına bağlanılamadı: ${error.message}`);
        });
        // Don't open panel on first click, just connect
      }
    } else {
      // Regular channel selection for text channels
      setActiveChannel(channel);
      // Hide voice screen when switching to text channels
      setShowVoiceScreen(false);
    }
  };

  const handleServerCreated = (newServer) => {
    setServers(prev => [...prev, newServer]);
    setActiveServer(newServer);
    
    // Find first text channel instead of just first channel
    if (newServer?.channels && Array.isArray(newServer.channels) && newServer.channels.length > 0) {
      const firstTextChannel = newServer.channels.find(channel => channel.type === 'text') || newServer.channels[0];
      setActiveChannel(firstTextChannel);
    }
    
    if (newServer?._id || newServer?.id) {
      // Socket.IO handles server connection automatically
    }
    // Removed English toast notification for server creation
  };

  const handleChannelCreated = (newChannel) => {
    if (activeServer) {
      const updatedServer = {
        ...activeServer,
        channels: [...(activeServer.channels || []), newChannel]
      };
      setActiveServer(updatedServer);
      setServers(prev => prev.map(s => 
        (s._id || s.id) === (activeServer._id || activeServer.id) ? updatedServer : s
      ));
      setActiveChannel(newChannel);
      // Removed English toast notification for channel creation
    }
  };

  const handleServerUpdate = (updatedServer) => {
    // Handle server deletion
    if (updatedServer.type === 'delete') {
      const deletedServerId = updatedServer.serverId;
      
      // Remove server from list
      setServers(prev => prev.filter(s => (s._id || s.id) !== deletedServerId));
      
      // If deleted server was active, switch to first available server or direct messages
      if (activeServer && (activeServer._id || activeServer.id) === deletedServerId) {
        const remainingServers = servers.filter(s => (s._id || s.id) !== deletedServerId);
        
        if (remainingServers.length > 0) {
          const firstServer = remainingServers[0];
          setActiveServer(firstServer);
          
          // Find first text channel in the new server
          if (firstServer.channels && firstServer.channels.length > 0) {
            const firstTextChannel = firstServer.channels.find(channel => channel.type === 'text') || firstServer.channels[0];
            setActiveChannel(firstTextChannel);
          }
          
          // Socket.IO handles server connection automatically
        } else {
          // No servers left, switch to direct messages
          setActiveServer(null);
          setActiveChannel(null);
          setIsDirectMessages(true);
        }
      }
      
      return;
    }
    
    // Handle server update (existing functionality)
    setActiveServer(updatedServer);
    setServers(prev => prev.map(s => 
      (s._id || s.id) === (updatedServer._id || updatedServer.id) ? updatedServer : s
    ));
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Fluxy...</p>
          <p className="text-sm text-gray-500 mt-2">
            Socket: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 flex overflow-hidden">
      {/* Server Sidebar */}
      <ServerSidebar
        servers={servers}
        activeServer={activeServer}
        onServerSelect={handleServerSelect}
        isDirectMessages={isDirectMessages}
        onServerCreated={handleServerCreated}
      />

      {/* Conditional Content Based on Selection */}
      {isDirectMessages ? (
        /* Direct Messages View */
        <DirectMessages onChannelSelect={handleChannelSelect} />
      ) : (
        /* Server View */
        <>
          {/* Channel Sidebar */}
          <ChannelSidebar
            server={activeServer}
            activeChannel={activeChannel}
            onChannelSelect={handleChannelSelect}
            onChannelCreated={handleChannelCreated}
            onServerUpdate={handleServerUpdate}
            voiceChannelUsers={voiceChannelUsers}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col relative">
            {/* Main Content - Always show Chat Area for text channels */}
            <div className="flex-1 flex">
              <div className="flex-1 flex">
                <ChatArea
                  channel={activeChannel}
                  server={activeServer}
                  showMemberList={showMemberList}
                  onToggleMemberList={() => setShowMemberList(!showMemberList)}
                />

                {/* Member List - Show for text channels */}
                {showMemberList && activeServer && activeChannel?.type === 'text' && (
                  <MemberList
                    server={activeServer}
                    activeChannel={activeChannel}
                  />
                )}
              </div>
            </div>

            {/* Voice Screen Overlay - Show when showVoiceScreen is true */}
            {showVoiceScreen && isVoiceConnected && currentVoiceChannel && (
              <div className="absolute inset-0 z-10">
                <VoiceScreen
                  channel={activeServer?.channels?.find(ch =>
                    (ch._id || ch.id) === currentVoiceChannel && ch.type === 'voice'
                  )}
                  server={activeServer}
                  onClose={() => {
                    setShowVoiceScreen(false);
                  }}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* User Panel - Fixed at bottom */}
      {!isDirectMessages && user && (
        <UserPanel user={user} server={activeServer} />
      )}
    </div>
  );
};

export default FluxyApp;