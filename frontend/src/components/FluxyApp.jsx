import React, { useState, useEffect, useMemo, useCallback } from "react";
import ServerSidebar from "./ServerSidebar";
import ChannelSidebar from "./ChannelSidebar";
import ChatArea from "./ChatArea";
import MemberList from "./MemberList";
import DirectMessages from "./DirectMessages";
import VoiceScreen from "./VoiceScreen";
import DesktopTitleBar from "./DesktopTitleBar";
import DesktopNotifications from "./DesktopNotifications";
import UserPanel from "./UserPanel";
import IncomingCallModal from "./IncomingCallModal";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../hooks/useSocket";
import voiceChatService from "../services/voiceChat";
import voiceCallService from "../services/voiceCallService";
import { useVoiceChat } from "../hooks/useVoiceChat";
import { useVoiceCall } from "../hooks/useVoiceCall";
import { serverAPI, channelAPI } from "../services/api";
import { toast } from "sonner";
import { devLog } from "../utils/devLogger";
import websocketService from "../services/websocket";
import electronAPI from "../utils/electronAPI";

const FluxyApp = () => {
  const { user, isAuthenticated } = useAuth();
  const { socket, isConnected, on } = useSocket();
  const { 
    isConnected: isVoiceConnected, 
    currentChannel: currentVoiceChannel,
    participants: voiceParticipants,
    connectedUsers,
    isMuted: isVoiceChatMuted,
    isDeafened,
    joinChannel: joinVoiceChannel,
    leaveChannel: leaveVoiceChannel
  } = useVoiceChat();
  
  const { 
    incomingCall, 
    currentCall, 
    callState, 
    initiateCall: initiateVoiceCall,
    acceptCall,
    rejectCall, 
    endCall, 
    toggleMute, 
    isSpeaking, 
    remoteSpeaking, 
    isMuted,
    callDuration,
    isScreenSharing,
    startScreenShare
  } = useVoiceCall();
  
  
  const [servers, setServers] = useState([]);
  const [activeServer, setActiveServer] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [showMemberList, setShowMemberList] = useState(true);
  const [isDirectMessages, setIsDirectMessages] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showVoiceScreen, setShowVoiceScreen] = useState(false);

  // Derive activeServerId from activeServer
  const activeServerId = activeServer?._id || activeServer?.id;
  const activeChannelId = activeChannel?._id || activeChannel?.id;
  
  // Initialize voice call service when socket is ready
  useEffect(() => {
    if (socket && socket.connected && user) {
      console.log('🎤 Initializing voice call service in FluxyApp');
      voiceCallService.initialize(socket);
    }
  }, [socket, socket?.connected, user]);

  // Create voiceChannelParticipants Map from voiceParticipants array
  const voiceChannelParticipants = useMemo(() => {
    const participantsMap = new Map();
    if (currentVoiceChannel && voiceParticipants && voiceParticipants.length > 0) {
      participantsMap.set(currentVoiceChannel, voiceParticipants);
    }
    return participantsMap;
  }, [currentVoiceChannel, voiceParticipants]);
  
  // Track active voice channel for UI - only set when explicitly opened via 2nd click
  // Don't automatically show voice panel just because user is connected

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
    // Voice channel users are now handled by useVoiceChat hook
  }, [activeServer?._id, activeServer?.id]);

  // Load user's servers on component mount - only when authenticated
  useEffect(() => {
    let isMounted = true;

    const loadServersOnce = async () => {
      // Don't load servers if user is not authenticated
      if (!user || !isMounted) return;

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
  }, [user]); // Run when user changes (login/logout)

  // Socket event listeners - more stable with useCallback
  useEffect(() => {
    const handleUserStatusUpdate = (data) => {
      const { userId, status } = data;
      
      // Convert both IDs to string for comparison
      const currentUserId = String(user?._id || user?.id);
      const updateUserId = String(userId);
      
      // Don't update status for current user - they handle their own status via AuthContext
      if (updateUserId === currentUserId) {
        return;
      }
      
      // Update user status in all servers (single update, activeServer will sync automatically)
      setServers(prevServers => {
        return prevServers.map(server => {
          if (!server.members) return server;
          
          const updatedMembers = server.members.map(member => {
            if (member.user && (String(member.user._id) === updateUserId || String(member.user.id) === updateUserId)) {
              return {
                ...member,
                user: {
                  ...member.user,
                  status: status
                }
              };
            }
            return member;
          });
          
          return {
            ...server,
            members: updatedMembers
          };
        });
      });
    };

    const handleVoiceChannelUpdate = (data) => {
      // DEPRECATED: Voice channel updates are now handled by useVoiceChat hook
    };

    // OPTIMIZED: Voice channel sync handler with state manager
    const handleVoiceChannelSync = (data) => {
      // DEPRECATED: Voice channel sync is now handled by useVoiceChat hook
    };

    const handleServerCreated = (data) => {
            devLog.log('Server created event received:', data);
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

    const handleServerJoined = (data) => {
      devLog.log('Server joined event received:', data);
      if (data.server) {
        setServers(prev => {
          // Check if server already exists to avoid duplicates
          const exists = prev.some(s => (s._id || s.id) === (data.server._id || data.server.id));
          if (!exists) {
            return [...prev, data.server];
          }
          return prev;
        });
        
        // Auto-select the joined server
        setActiveServer(data.server);
        if (data.server.channels && data.server.channels.length > 0) {
          const firstChannel = data.server.channels.find(c => c.type === 'text') || data.server.channels[0];
          setActiveChannel(firstChannel);
        }
        setIsDirectMessages(false);
      }
    };

    const handleChannelCreated = (channelData) => {
      // Add new channel to the active server if it's the current server
      if (activeServer && (activeServer._id === channelData.server || activeServer.id === channelData.server)) {
        setActiveServer(prevServer => ({
          ...prevServer,
          channels: [...(prevServer.channels || []), channelData]
        }));
      }
    };

    const handleChannelDeleted = ({ channelId, serverId }) => {
      // Remove channel from the active server if it's the current server
      if (activeServer && (activeServer._id === serverId || activeServer.id === serverId)) {
        setActiveServer(prevServer => ({
          ...prevServer,
          channels: prevServer.channels?.filter(channel => 
            channel._id !== channelId && channel.id !== channelId
          ) || []
        }));
        
        // If the deleted channel was the active channel, switch to another one
        if (activeChannel && (activeChannel._id === channelId || activeChannel.id === channelId)) {
          const remainingChannels = activeServer.channels?.filter(channel => 
            channel._id !== channelId && channel.id !== channelId
          ) || [];
          
          if (remainingChannels.length > 0) {
            const nextChannel = remainingChannels.find(c => c.type === 'text') || remainingChannels[0];
            setActiveChannel(nextChannel);
          } else {
            setActiveChannel(null);
          }
        }
      }
    };

    const handleUserProfileUpdate = (profileUpdate) => {
      const { userId, username, displayName, avatar, bio, pronouns, banner } = profileUpdate;
      
      // Update user in servers
      setServers(prevServers => {
        return prevServers.map(server => {
          const updatedMembers = server.members?.map(member => {
            if (member.user._id === userId || member.user.id === userId) {
              return {
                ...member,
                user: {
                  ...member.user,
                  username: username || member.user.username,
                  displayName: displayName || member.user.displayName,
                  avatar: avatar || member.user.avatar,
                  bio: bio || member.user.bio,
                  pronouns: pronouns || member.user.pronouns,
                  banner: banner || member.user.banner
                }
              };
            }
            return member;
          });
          
          return {
            ...server,
            members: updatedMembers
          };
        });
      });
      
      // Update active server
      setActiveServer(prevServer => {
        if (!prevServer) return prevServer;
        
        const updatedMembers = prevServer.members?.map(member => {
          if (member.user._id === userId || member.user.id === userId) {
            return {
              ...member,
              user: {
                ...member.user,
                username: username || member.user.username,
                displayName: displayName || member.user.displayName,
                avatar: avatar || member.user.avatar,
                bio: bio || member.user.bio,
                pronouns: pronouns || member.user.pronouns,
                banner: banner || member.user.banner
              }
            };
          }
          return member;
        });
        
        return {
          ...prevServer,
          members: updatedMembers
        };
      });
    };

    const handleRoleAssignment = (roleData) => {
      const { userId, serverId, roleId, roleName, roleColor, action } = roleData;
      
      // Update servers state
      setServers(prevServers => {
        return prevServers.map(server => {
          if ((server._id || server.id) === serverId) {
            const updatedMembers = server.members?.map(member => {
              if (member.user._id === userId || member.user.id === userId) {
                if (action === 'assigned') {
                  // Add role if not already present
                  if (!member.roles?.includes(roleId)) {
                    return {
                      ...member,
                      roles: [...(member.roles || []), roleId]
                    };
                  }
                } else if (action === 'removed') {
                  // Remove role
                  return {
                    ...member,
                    roles: (member.roles || []).filter(r => r !== roleId)
                  };
                }
              }
              return member;
            });
            
            return {
              ...server,
              members: updatedMembers
            };
          }
          return server;
        });
      });
      
      // Update active server if it matches
      setActiveServer(prevServer => {
        if (!prevServer || (prevServer._id || prevServer.id) !== serverId) {
          return prevServer;
        }
        
        const updatedMembers = prevServer.members?.map(member => {
          if (member.user._id === userId || member.user.id === userId) {
            if (action === 'assigned') {
              // Add role if not already present
              if (!member.roles?.includes(roleId)) {
                return {
                  ...member,
                  roles: [...(member.roles || []), roleId]
                };
              }
            } else if (action === 'removed') {
              // Remove role
              return {
                ...member,
                roles: (member.roles || []).filter(r => r !== roleId)
              };
            }
          }
          return member;
        });
        
        return {
          ...prevServer,
          members: updatedMembers
        };
      });
    };

    const handleServerUpdate = (updateData) => {
      const { serverId, name, description, icon } = updateData;
      
      // Update servers list
      setServers(prevServers => {
        return prevServers.map(server => {
          if ((server._id || server.id) === serverId) {
            return {
              ...server,
              name: name || server.name,
              description: description !== undefined ? description : server.description,
              icon: icon || server.icon
            };
          }
          return server;
        });
      });
      
      // Update active server if it matches
      setActiveServer(prevServer => {
        if (!prevServer || (prevServer._id || prevServer.id) !== serverId) {
          return prevServer;
        }
        
        return {
          ...prevServer,
          name: name || prevServer.name,
          description: description !== undefined ? description : prevServer.description,
          icon: icon || prevServer.icon
        };
      });
    };

    const handleMemberKicked = (kickData) => {
      const { serverId, userId, kickedByUsername, kickedUser, reason } = kickData;
      
      // Remove member from servers list
      setServers(prevServers => {
        return prevServers.map(server => {
          if ((server._id || server.id) === serverId) {
            const updatedMembers = server.members?.filter(member => 
              (member.user._id || member.user.id) !== userId
            );
            return {
              ...server,
              members: updatedMembers
            };
          }
          return server;
        });
      });
      
      // Remove member from active server
      setActiveServer(prevServer => {
        if (!prevServer || (prevServer._id || prevServer.id) !== serverId) {
          return prevServer;
        }
        
        const updatedMembers = prevServer.members?.filter(member => 
          (member.user._id || member.user.id) !== userId
        );
        
        return {
          ...prevServer,
          members: updatedMembers
        };
      });
    };

    const handleMemberLeft = (leftData) => {
      const { serverId, userId, username } = leftData;
      
      // Remove member from servers list
      setServers(prevServers => {
        return prevServers.map(server => {
          if ((server._id || server.id) === serverId) {
            const updatedMembers = server.members?.filter(member => {
              const memberUserId = member?.user?._id || member?.user?.id || member?._id || member?.id;
              return memberUserId && memberUserId !== userId;
            });
            return {
              ...server,
              members: updatedMembers
            };
          }
          return server;
        });
      });
      
      // Remove member from active server
      setActiveServer(prevServer => {
        if (!prevServer || (prevServer._id || prevServer.id) !== serverId) {
          return prevServer;
        }
        
        const updatedMembers = prevServer.members?.filter(member => {
          const memberUserId = member?.user?._id || member?.user?.id || member?._id || member?.id;
          return memberUserId && memberUserId !== userId;
        });
        
        return {
          ...prevServer,
          members: updatedMembers
        };
      });
    };

    const handleMemberBanned = (banData) => {
      const { serverId, userId, bannedByUsername, bannedUser, reason } = banData;
      
      // Remove member from servers list (same as kick)
      setServers(prevServers => {
        return prevServers.map(server => {
          if ((server._id || server.id) === serverId) {
            const updatedMembers = server.members?.filter(member => 
              (member.user._id || member.user.id) !== userId
            );
            return {
              ...server,
              members: updatedMembers
            };
          }
          return server;
        });
      });
      
      // Remove member from active server
      setActiveServer(prevServer => {
        if (!prevServer || (prevServer._id || prevServer.id) !== serverId) {
          return prevServer;
        }
        
        const updatedMembers = prevServer.members?.filter(member => 
          (member.user._id || member.user.id) !== userId
        );
        
        return {
          ...prevServer,
          members: updatedMembers
        };
      });
    };

    const handleUserKicked = (kickData) => {
      const { serverId, serverName, kickedBy, reason } = kickData;
      
      // Remove server from user's server list
      setServers(prevServers => 
        prevServers.filter(server => (server._id || server.id) !== serverId)
      );
      
      // If kicked from current server, go to home
      if (activeServer && (activeServer._id || activeServer.id) === serverId) {
        setActiveServer(null);
        setActiveChannel(null);
        setIsDirectMessages(true);
      }
    };

    const handleUserBanned = (banData) => {
      const { serverId, serverName, bannedBy, reason } = banData;
      
      // Remove server from user's server list (same as kick)
      setServers(prevServers => 
        prevServers.filter(server => (server._id || server.id) !== serverId)
      );
      
      // If banned from current server, go to home
      if (activeServer && (activeServer._id || activeServer.id) === serverId) {
        setActiveServer(null);
        setActiveChannel(null);
        setIsDirectMessages(true);
      }
    };

    const handleUserActivityUpdate = (activityData) => {
      const { userId, username, activity } = activityData;
      
      // Update user activity in servers
      setServers(prevServers => {
        return prevServers.map(server => {
          const updatedMembers = server.members?.map(member => {
            if (member.user._id === userId || member.user.id === userId) {
              return {
                ...member,
                user: {
                  ...member.user,
                  activity: activity
                }
              };
            }
            return member;
          });
          
          return {
            ...server,
            members: updatedMembers
          };
        });
      });
      
      // Update active server
      setActiveServer(prevServer => {
        if (!prevServer) return prevServer;
        
        const updatedMembers = prevServer.members?.map(member => {
          if (member.user._id === userId || member.user.id === userId) {
            return {
              ...member,
              user: {
                ...member.user,
                activity: activity
              }
            };
          }
          return member;
        });
        
        return {
          ...prevServer,
          members: updatedMembers
        };
      });
    };

    const handleInviteCreated = (inviteData) => {
      const { serverId, inviteCode, createdByUsername, serverName } = inviteData;
      
      // Update server invite code if needed
      setServers(prevServers => {
        return prevServers.map(server => {
          if ((server._id || server.id) === serverId) {
            return {
              ...server,
              inviteCode: inviteCode
            };
          }
          return server;
        });
      });
    };

    const handleMemberJoinedViaInvite = (joinData) => {
      const { serverId, newMember, inviteCode, joinedAt } = joinData;
      
      // Could show notification or update UI
      // For now just log the invite usage
    };

    const handleNewMemberJoined = (memberData) => {
      const { serverId, member } = memberData;
      
      // Check if the joined member is the current user
      const isCurrentUser = member?.user?._id === user?._id || member?.user?.id === user?.id;
      
      if (isCurrentUser) {
        // Current user joined a new server - fetch updated server list
        loadServersOnce();
        
        // Join the new server's socket room
        if (emit) {
          emit('joinServer', serverId);
        }
        
        return;
      }
      
      // Add new member to server members list for other users
      setServers(prevServers => {
        return prevServers.map(server => {
          if ((server._id || server.id) === serverId) {
            // Check if member already exists to avoid duplicates
            const memberExists = server.members?.some(existingMember => {
              const existingUserId = existingMember?.user?._id || existingMember?.user?.id || existingMember?._id || existingMember?.id;
              const newUserId = member?.user?._id || member?.user?.id || member?._id || member?.id;
              return existingUserId && newUserId && existingUserId === newUserId;
            });
            
            if (!memberExists) {
              const updatedMembers = [...(server.members || []), member];
              return {
                ...server,
                members: updatedMembers
              };
            }
          }
          return server;
        });
      });
      
      // Add member to active server if it matches
      setActiveServer(prevServer => {
        if (!prevServer || (prevServer._id || prevServer.id) !== serverId) {
          return prevServer;
        }
        
        // Check if member already exists to avoid duplicates
        const memberExists = prevServer.members?.some(existingMember => {
          const existingUserId = existingMember?.user?._id || existingMember?.user?.id || existingMember?._id || existingMember?.id;
          const newUserId = member?.user?._id || member?.user?.id || member?._id || member?.id;
          return existingUserId && newUserId && existingUserId === newUserId;
        });
        
        if (!memberExists) {
          const updatedMembers = [...(prevServer.members || []), member];
          return {
            ...prevServer,
            members: updatedMembers
          };
        }
        
        return prevServer;
      });
    };

    const unsubscribeUserStatus = on('userStatusUpdate', handleUserStatusUpdate);
    const unsubscribeUserProfile = on('userProfileUpdate', handleUserProfileUpdate);
    const unsubscribeUserActivity = on('userActivityUpdate', handleUserActivityUpdate);
    const unsubscribeRoleAssignment = on('roleAssignment', handleRoleAssignment);
    const unsubscribeServerUpdate = on('serverUpdate', handleServerUpdate);
    const unsubscribeMemberKicked = on('memberKicked', handleMemberKicked);
    const unsubscribeMemberBanned = on('memberBanned', handleMemberBanned);
    const unsubscribeMemberLeft = on('memberLeft', handleMemberLeft);
    const unsubscribeUserKicked = on('kicked', handleUserKicked);
    const unsubscribeUserBanned = on('banned', handleUserBanned);
    const unsubscribeInviteCreated = on('inviteCreated', handleInviteCreated);
    const unsubscribeMemberJoinedViaInvite = on('memberJoinedViaInvite', handleMemberJoinedViaInvite);
    const unsubscribeNewMemberJoined = on('newMemberJoined', handleNewMemberJoined);
    const unsubscribeServerCreated = on('serverCreated', handleServerCreated);
    const unsubscribeServerJoined = on('serverJoined', handleServerJoined);
    const unsubscribeChannelCreated = on('channelCreated', handleChannelCreated);
    const unsubscribeChannelDeleted = on('channelDeleted', handleChannelDeleted);

    return () => {
      unsubscribeUserStatus();
      unsubscribeUserProfile();
      unsubscribeUserActivity();
      unsubscribeRoleAssignment();
      unsubscribeServerUpdate();
      unsubscribeMemberKicked();
      unsubscribeMemberBanned();
      unsubscribeMemberLeft();
      unsubscribeUserKicked();
      unsubscribeUserBanned();
      unsubscribeInviteCreated();
      unsubscribeMemberJoinedViaInvite();
      unsubscribeNewMemberJoined();
      unsubscribeServerCreated();
      unsubscribeServerJoined();
      unsubscribeChannelCreated();
      unsubscribeChannelDeleted();

      // Listen for voice channel leave events to close the voice screen
      const handleVoiceChannelLeft = () => {
        console.log('🎤 Voice channel left - closing voice screen');
        setShowVoiceScreen(false);
      };

      window.addEventListener('voiceChannelLeft', handleVoiceChannelLeft);
      return () => {
        window.removeEventListener('voiceChannelLeft', handleVoiceChannelLeft);
      };
    };
  }, []); // Empty dependency - set up listeners only once

  const handleServerSelect = async (server) => {
    // Discord-like behavior: Stay in voice channel when switching servers/sections
    // Only hide voice screen UI, don't leave the voice channel
    
    if (server === "home") {
      setIsDirectMessages(true);
      setActiveServer(null);
      setActiveChannel(null);
      setShowVoiceScreen(false); // Hide voice screen when going to DMs, but stay connected
      setTargetUserId(null); // Clear target user when manually going to DMs
      setClearDMSelection(true); // Clear selected conversation
      // Reset clearSelection flag after a brief delay
      setTimeout(() => setClearDMSelection(false), 100);
    } else {
      setIsDirectMessages(false);

      // Leave previous server - handled automatically by Socket.IO
      if (activeServer && activeServer._id) {
        // Socket.IO handles server switching automatically
      }

      setActiveServer(server);
      setShowVoiceScreen(false); // Hide voice screen when switching servers, but stay connected

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

  const handleChannelSelect = async (channel) => {
    // Special handling for voice channels
    if (channel.type === 'voice') {
      const channelId = channel._id || channel.id;

      // Set current user data in voiceChatService BEFORE joining
      const userId = user?.id || user?._id;
      if (userId && voiceChatService.currentUserId !== userId) {
        // Set both user ID and user data
        if (voiceChatService.setCurrentUser) {
          voiceChatService.setCurrentUser(user);
        } else if (voiceChatService.setCurrentUserId) {
          voiceChatService.setCurrentUserId(userId);
        } else {
          voiceChatService.currentUserId = userId;
        }
      }

      const status = voiceChatService.getStatus();
      const isAlreadyConnected = status.isConnected && status.currentChannel === channelId;

      if (isAlreadyConnected && showVoiceScreen) {
        // If already connected to this channel and panel is open, toggle panel
        setShowVoiceScreen(prev => !prev);
      } else if (isAlreadyConnected && !showVoiceScreen) {
        // If already connected but panel is closed, just open panel
        setShowVoiceScreen(true);
      } else {
        // Not connected to this channel, connect and show panel
        try {
          // If connected to different voice channel, leave first
          if (isVoiceConnected && currentVoiceChannel && currentVoiceChannel !== channelId) {
            await leaveVoiceChannel();
          }
          
          await joinVoiceChannel(channelId);
          setShowVoiceScreen(true); // Show panel on connection
        } catch (error) {
          toast.error(`Ses kanalına bağlanılamadı: ${error.message}`);
        }
      }
    } else {
      // Regular channel selection for text channels
      setActiveChannel(channel);
      
      // Discord behavior: Stay in voice channel when switching text channels
      // Only hide voice screen, don't leave voice channel
      setShowVoiceScreen(false);
    }
  };

  const handleVoiceChannelJoin = async (channel) => {
    try {
      await joinVoiceChannel(channel._id || channel.id);
      setShowVoiceScreen(true);
    } catch (error) {
      toast.error(`Ses kanalına bağlanılamadı: ${error.message}`);
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
    // Handle server deletion or leave
    if (updatedServer.type === 'delete' || updatedServer.type === 'leave') {
      const removedServerId = updatedServer.serverId;
      
      // Remove server from list
      setServers(prev => prev.filter(s => (s._id || s.id) !== removedServerId));
      
      // If removed server was active, switch to first available server or direct messages
      if (activeServer && (activeServer._id || activeServer.id) === removedServerId) {
        const remainingServers = servers.filter(s => (s._id || s.id) !== removedServerId);
        
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

  // Handle direct message navigation from UserProfileModal
  const [targetUserId, setTargetUserId] = useState(null);
  const [clearDMSelection, setClearDMSelection] = useState(false);
  
  const handleDirectMessageNavigation = (userId) => {
    // Switch to direct messages view
    setIsDirectMessages(true);
    setActiveServer(null);
    setActiveChannel(null);
    setShowVoiceScreen(false);
    
    // Set target user ID for DirectMessages component
    setTargetUserId(userId);
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
    <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden transition-optimized">
      {/* Desktop Title Bar (Electron only) */}
      <DesktopTitleBar title={activeServer?.name ? `Fluxy - ${activeServer.name}` : 'Fluxy'} />
      
      {/* Desktop Notifications Handler (Electron only) */}
      <DesktopNotifications />
      
      {/* Main App Content */}
      <div className="flex-1 flex overflow-hidden min-h-0 scroll-optimized">
        {/* Server Sidebar - Always visible */}
        <ServerSidebar
          servers={servers}
          activeServerId={isDirectMessages ? null : activeServerId}
          onServerSelect={handleServerSelect}
          onDirectMessages={() => {
            setIsDirectMessages(true);
            setTargetUserId(null); // Clear target user when manually going to DMs
            setClearDMSelection(true); // Clear selected conversation
            // Reset clearSelection flag after a brief delay
            setTimeout(() => setClearDMSelection(false), 100);
          }}
          user={user}
        />

        {isDirectMessages ? (
          <DirectMessages 
            user={user}
            onBack={() => {
              setIsDirectMessages(false);
              setTargetUserId(null); // Clear target user when going back
            }}
            targetUserId={targetUserId}
            clearSelection={clearDMSelection}
            initiateVoiceCall={initiateVoiceCall}
            currentCall={currentCall}
            callState={callState}
            endCall={endCall}
            toggleMute={toggleMute}
            isSpeaking={isSpeaking}
            remoteSpeaking={remoteSpeaking}
            isMuted={isMuted}
            callDuration={callDuration}
            isScreenSharing={isScreenSharing}
            startScreenShare={startScreenShare}
          />
        ) : (
          <>
            {/* Channel Sidebar */}
            {activeServer && (
              <ChannelSidebar
                server={activeServer}
                activeChannel={activeChannel}
                onChannelSelect={handleChannelSelect}
                onVoiceChannelJoin={handleVoiceChannelJoin}
                voiceChannelParticipants={voiceChannelParticipants}
                currentVoiceChannel={currentVoiceChannel}
                isVoiceConnected={isVoiceConnected}
                isMuted={isMuted}
                isDeafened={isDeafened}
                user={user}
                onChannelCreated={handleChannelCreated}
                onServerUpdate={handleServerUpdate}
              />
            )}
            <div className="flex-1 flex overflow-hidden">
              {/* Chat Area or Voice Screen - Desktop: flex-1, Mobile: full width */}
              <div className="flex-1 flex flex-col min-w-0">
                {showVoiceScreen && currentVoiceChannel ? (() => {
                  // Find the voice channel that should be displayed
                  const voiceChannel = activeServer?.channels?.find(ch =>
                    ch.type === 'voice' && (ch._id || ch.id) === currentVoiceChannel
                  );

                  if (!voiceChannel) {
                    return activeChannel ? (
                      <ChatArea
                        channel={activeChannel}
                        server={activeServer}
                        user={user}
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center bg-gray-800">
                        <div className="text-center">
                          <h2 className="text-2xl font-bold text-gray-300 mb-2">
                            {electronAPI.isElectron() ? 'Fluxy Desktop\'a Hoş Geldiniz!' : 'Fluxy\'ye Hoş Geldiniz!'}
                          </h2>
                          <p className="text-gray-400">
                            {activeServer 
                              ? 'Sohbet etmek için bir kanal seçin'
                              : 'Başlamak için bir sunucu seçin'
                            }
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <VoiceScreen
                      channel={voiceChannel}
                      server={activeServer}
                      servers={servers} // Pass servers list for fallback
                      voiceChannelUsers={voiceChannelParticipants || []} // Fix undefined variable
                      onClose={() => {
                        setShowVoiceScreen(false);
                      }}
                      currentUser={user}
                      isSidebar={false}
                    />
                  );
                })() : activeChannel ? (
                  <ChatArea
                    channel={activeChannel}
                    server={activeServer}
                    user={user}
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center bg-gray-800">
                    <div className="text-center">
                      <h2 className="text-2xl font-bold text-gray-300 mb-2">
                        {electronAPI.isElectron() ? 'Fluxy Desktop\'a Hoş Geldiniz!' : 'Fluxy\'ye Hoş Geldiniz!'}
                      </h2>
                      <p className="text-gray-400">
                        {activeServer 
                          ? 'Sohbet etmek için bir kanal seçin'
                          : 'Başlamak için bir sunucu seçin'
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Member List - Desktop: right sidebar, Mobile: hidden, Electron: always show */}
              {activeChannel && (
                <div className={`${typeof window !== 'undefined' && window.electronAPI?.isElectron ? 'flex' : 'hidden lg:flex'} w-72 flex-shrink-0`}>
                  <MemberList
                    server={activeServer}
                    channel={activeChannel}
                    user={user}
                    onDirectMessageNavigation={handleDirectMessageNavigation}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* User Panel - Fixed at bottom */}
      {user && (
        <UserPanel user={user} server={activeServer} servers={servers} />
      )}

      {/* Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallModal
          isOpen={true}
          callData={incomingCall}
          onAccept={async () => {
            const result = await acceptCall();
            if (!result.success) {
              toast.error(result.error || 'Arama kabul edilemedi');
            }
          }}
          onReject={() => {
            rejectCall();
          }}
        />
      )}
    </div>
  );
};

export default FluxyApp;
