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
import { serverAPI, channelAPI } from "../services/api";
import { toast } from "sonner";
import { devLog } from "../utils/devLogger";
import websocketService from "../services/websocket";

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
      if (status.currentChannel) {
        setVoiceChannelUsers(prev => ({
          ...prev,
          [status.currentChannel]: status.connectedUsers
        }));
      }
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

    const loadVoiceChannelUsers = async () => {
      if (activeServer?._id || activeServer?.id) {
        try {
          const serverId = activeServer._id || activeServer.id;
          console.log('🔄 Loading voice channel users for server (backend-first):', serverId);
          
          const response = await channelAPI.getChannels(serverId);
          
          if (response.data.channels) {
            console.log('📝 Channels response from backend:', response.data.channels);
            const voiceChannelUsersMap = {};
            
            response.data.channels.forEach(channel => {
              if (channel.type === 'voice' && channel.connectedUsers) {
                console.log(`🎙️ Voice channel ${channel.name}:`, channel.connectedUsers);
                voiceChannelUsersMap[channel.id] = channel.connectedUsers.map(cu => 
                  cu.user?._id || cu.user?.id || cu.user
                );
              }
            });
            
            console.log('🔊 Setting voice channel users from backend:', voiceChannelUsersMap);
            // Backend is always the source of truth - no merging, just set
            setVoiceChannelUsers(voiceChannelUsersMap);
          }
          
        } catch (error) {
          console.warn('Failed to load voice channel users from backend:', error);
        }
      }
    };

    loadServerMembers();
    loadVoiceChannelUsers(); // Re-enabled with proper backend-first approach
  }, [activeServer?._id, activeServer?.id]);

  // Update voice channel users
  useEffect(() => {
    const updateVoiceUsers = () => {
      const status = voiceChatService.getStatus();

      if (status.currentChannel) {
        // Add current user to connected users if not already included
        let connectedUsers = [...(status.connectedUsers || [])];
        
        const userId = user?.id || user?._id;
        if (userId && !connectedUsers.includes(userId)) {
          connectedUsers = [userId, ...connectedUsers];
        }

        setVoiceChannelUsers(prev => ({
          ...prev, // Keep existing voice channel data from other channels
          [status.currentChannel]: connectedUsers
        }));
      } else {
        // When disconnected, clear current channel data only
        setVoiceChannelUsers(prev => {
          const newState = { ...prev };
          if (status.currentChannel) {
            delete newState[status.currentChannel];
          }
          return newState;
        });
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
          
          // Load voice channel users for initial server - DISABLED FOR TESTING
          /*
          try {
            const channelsResponse = await channelAPI.getChannels(firstServer._id || firstServer.id);
            if (channelsResponse.data.channels) {
              console.log('📝 Initial channels response:', channelsResponse.data.channels);
              const voiceChannelUsersMap = {};
              
              channelsResponse.data.channels.forEach(channel => {
                if (channel.type === 'voice' && channel.connectedUsers) {
                  console.log(`🎙️ Initial voice channel ${channel.name}:`, channel.connectedUsers);
                  voiceChannelUsersMap[channel.id] = channel.connectedUsers.map(cu => 
                    cu.user?._id || cu.user?.id || cu.user
                  );
                }
              });
              
              console.log('🔊 Initial voice channel users loaded:', voiceChannelUsersMap);
              // Merge with existing state instead of overriding socket updates
              setVoiceChannelUsers(prev => {
                const merged = { ...voiceChannelUsersMap };
                // Preserve any existing socket data that might be newer
                Object.keys(prev).forEach(channelId => {
                  if (prev[channelId] && prev[channelId].length > 0) {
                    // Keep socket data if it has users
                    merged[channelId] = prev[channelId];
                    console.log(`🔄 Keeping existing socket data for channel ${channelId}:`, prev[channelId]);
                  }
                });
                console.log('🎯 Initial merged state:', merged);
                return merged;
              });
            }
          } catch (error) {
            console.warn('Failed to load initial voice channel users:', error);
          }
          */
          
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
      const { userId, status } = data;
      
      // Convert both IDs to string for comparison
      const currentUserId = String(user?._id || user?.id);
      const updateUserId = String(userId);
      
      // Don't update status for current user - they handle their own status via AuthContext
      if (updateUserId === currentUserId) {
        return;
      }
      
      // Update user status in all servers (only for other users)
      setServers(prevServers => {
        const updatedServers = prevServers.map(server => {
          if (!server.members) return server;
          
          let memberUpdated = false;
          const updatedMembers = server.members.map(member => {
            if (member.user && (String(member.user._id) === updateUserId || String(member.user.id) === updateUserId)) {
              memberUpdated = true;
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
          
          return memberUpdated ? {
            ...server,
            members: updatedMembers
          } : server;
        });
        
        return updatedServers;
      });
      
      // Update user status in the current server's members (only for other users)
      setActiveServer(prevServer => {
        if (!prevServer || !prevServer.members) return prevServer;
        
        let memberUpdated = false;
        const updatedMembers = prevServer.members.map(member => {
          if (member.user && (String(member.user._id) === updateUserId || String(member.user.id) === updateUserId)) {
            memberUpdated = true;
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
        
        return memberUpdated ? {
          ...prevServer,
          members: updatedMembers
        } : prevServer;
      });
    };

    const handleVoiceChannelUpdate = (data) => {
      const { channelId, action, userId } = data;
      console.log('🔊 Voice channel update received:', { channelId, action, userId });
      const currentUserId = user?.id || user?._id;
      console.log('👤 Current user ID:', currentUserId);
      console.log('🏠 Active server:', activeServer?._id || activeServer?.id);
      console.log('📡 Socket connection status:', isConnected);
      
      // Update voice channel users based on socket event only
      // Backend is the source of truth, socket just applies incremental updates
      setVoiceChannelUsers(prev => {
        console.log('📊 Current voiceChannelUsers state:', prev);
        const currentUsers = prev[channelId] || [];
        console.log('👥 Current users in channel:', currentUsers);
        
        if (action === 'userJoined') {
          // Add user if not already in channel
          if (!currentUsers.includes(userId)) {
            const newUsers = [...currentUsers, userId];
            console.log('➕ Adding user to voice channel:', userId, 'New users:', newUsers);
            console.log('🔍 User comparison - Event userId:', userId, 'Current userId:', currentUserId, 'Match:', userId === currentUserId);
            
            const newState = {
              ...prev,
              [channelId]: newUsers
            };
            console.log('🔄 New voiceChannelUsers state:', newState);
            return newState;
          } else {
            console.log('⚠️ User already in channel:', userId);
            console.log('🔍 Debug - Event userId:', userId, 'Current userId:', currentUserId);
            console.log('🔍 Debug - Users in channel:', currentUsers);
            console.log('🔍 Debug - userId in array:', currentUsers.includes(userId));
          }
        } else if (action === 'userLeft') {
          // Remove user from channel
          const newUsers = currentUsers.filter(id => id !== userId);
          console.log('➖ Removing user from voice channel:', userId, 'New users:', newUsers);
          return {
            ...prev,
            [channelId]: newUsers
          };
        }
        
        return prev;
      });
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
      const isCurrentUser = member.user._id === user?._id || member.user.id === user?.id;
      
      if (isCurrentUser) {
        // Current user joined a new server - fetch updated server list
        loadServersOnce();
        
        // Join the new server's socket room
        if (emit) {
          console.log(`🏠 Joining socket room for new server: ${serverId}`);
          emit('joinServer', serverId);
        }
        
        return;
      }
      
      // Add new member to server members list for other users
      setServers(prevServers => {
        return prevServers.map(server => {
          if ((server._id || server.id) === serverId) {
            // Check if member already exists to avoid duplicates
            const memberExists = server.members?.some(existingMember => 
              (existingMember.user._id || existingMember.user.id) === (member.user._id || member.user.id)
            );
            
            if (!memberExists) {
              const updatedMembers = [...(server.members || []), member];
              console.log('👥 Adding new member to server:', member.user.username || member.user.displayName);
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
        const memberExists = prevServer.members?.some(existingMember => 
          (existingMember.user._id || existingMember.user.id) === (member.user._id || member.user.id)
        );
        
        if (!memberExists) {
          const updatedMembers = [...(prevServer.members || []), member];
          console.log('👥 Adding new member to active server:', member.user.username || member.user.displayName);
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
    const unsubscribeUserKicked = on('kicked', handleUserKicked);
    const unsubscribeUserBanned = on('banned', handleUserBanned);
    const unsubscribeInviteCreated = on('inviteCreated', handleInviteCreated);
    const unsubscribeMemberJoinedViaInvite = on('memberJoinedViaInvite', handleMemberJoinedViaInvite);
    const unsubscribeNewMemberJoined = on('newMemberJoined', handleNewMemberJoined);
    const unsubscribeVoiceUpdate = on('voiceChannelUpdate', handleVoiceChannelUpdate);
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
      unsubscribeUserKicked();
      unsubscribeUserBanned();
      unsubscribeInviteCreated();
      unsubscribeMemberJoinedViaInvite();
      unsubscribeNewMemberJoined();
      unsubscribeVoiceUpdate();
      unsubscribeServerCreated();
      unsubscribeServerJoined();
      unsubscribeChannelCreated();
      unsubscribeChannelDeleted();
    };
  }, []); // Empty dependency - set up listeners only once

  const handleServerSelect = (server) => {
    console.log('🏠 Server selected:', server);
    
    if (server === "home") {
      setIsDirectMessages(true);
      setActiveServer(null);
      setActiveChannel(null);
      setShowVoiceScreen(false); // Hide voice screen when going to DMs
      console.log('📱 Switched to Direct Messages');
    } else {
      setIsDirectMessages(false);

      // Leave previous server - handled automatically by Socket.IO
      if (activeServer && activeServer._id) {
        // Socket.IO handles server switching automatically
        console.log('🔄 Switching from server:', activeServer.name);
      }

      setActiveServer(server);
      setShowVoiceScreen(false); // Hide voice screen when switching servers
      console.log('🏠 Set active server:', server?.name, 'ID:', server?._id || server?.id);

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
            {(() => {
              const shouldShow = showVoiceScreen && isVoiceConnected && currentVoiceChannel;
              console.log('🔍 VoiceScreen render conditions:', {
                showVoiceScreen,
                isVoiceConnected,
                currentVoiceChannel,
                shouldShow,
                voiceChannelUsers: voiceChannelUsers[currentVoiceChannel] || []
              });
              return shouldShow && (
                <div className="absolute inset-0 z-10">
                  {console.log('🔍 VoiceScreen props debug:', {
                    currentVoiceChannel,
                    voiceChannelUsersState: voiceChannelUsers,
                    propValue: voiceChannelUsers[currentVoiceChannel],
                    propArray: voiceChannelUsers[currentVoiceChannel] || []
                  })}
                  <VoiceScreen
                    channel={activeServer?.channels?.find(ch =>
                      (ch._id || ch.id) === currentVoiceChannel && ch.type === 'voice'
                    )}
                    server={activeServer}
                    servers={servers} // Pass servers list for fallback
                    voiceChannelUsers={voiceChannelUsers[currentVoiceChannel] || []}
                    onClose={() => {
                      setShowVoiceScreen(false);
                    }}
                  />
                </div>
              );
            })()}
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
