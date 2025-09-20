import React, { useState, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Loader2, User, Crown } from "lucide-react";
import { serverAPI } from "../services/api";
import { useSocket } from "../hooks/useSocket";
import { useAuth } from "../context/AuthContext";
import { UserProfileModal } from "./UserProfileModal";

const MemberList = ({ server, activeChannel }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { on } = useSocket();
  const { user: currentUser } = useAuth();

  const getStatusColor = (status) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "idle": return "bg-yellow-500";
      case "dnd": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "online": return "Çevrimiçi";
      case "idle": return "Boşta";
      case "dnd": return "Rahatsız Etmeyin";
      default: return "Çevrimdışı";
    }
  };

  const handleMemberClick = (member) => {
    setSelectedUser(member);
    setIsProfileOpen(true);
  };

  // Fetch server members
  useEffect(() => {
    const fetchMembers = async () => {
      if (!server?._id && !server?.id) {
        setMembers([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await serverAPI.getServerMembers(server._id || server.id);
        
        let fetchedMembers = response.data.members || [];
        
        // Update current user's status with AuthContext status
        if (currentUser) {
          fetchedMembers = fetchedMembers.map(member => {
            const memberUserId = String(member.id || member._id);
            const currentUserId = String(currentUser._id || currentUser.id);
            
            return memberUserId === currentUserId
              ? { ...member, status: currentUser.status || 'online' }
              : member;
          });
        }
        
        setMembers(fetchedMembers);
      } catch (error) {
        // No fallback - show empty state
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [server]); // Only fetch when server changes, not when currentUser changes

  // Listen for real-time member updates
  useEffect(() => {
    const handleUserStatusUpdate = ({ userId, status, username }) => {
      // Convert both IDs to string for comparison
      const currentUserId = String(currentUser?._id || currentUser?.id);
      const updateUserId = String(userId);
      
      setMembers(prev => prev.map(member => {
        // Check if this member's user ID matches the updated user
        const memberUserId = String(member.user?._id || member.user?.id || member.id || member._id);
        const shouldUpdate = memberUserId === updateUserId;
        
        if (shouldUpdate) {
          // Update the user's status within the member object
          if (member.user) {
            return { 
              ...member, 
              user: { 
                ...member.user, 
                status 
              } 
            };
          } else {
            // Fallback for direct member objects
            return { ...member, status };
          }
        }
        return member;
      }));
    };

    const handleUserJoinedServer = ({ user, server: serverData }) => {
      if (serverData._id === server?._id || serverData.id === server?.id) {
        setMembers(prev => [...prev.filter(m => m.id !== user._id), {
          id: user._id,
          username: user.username,
          avatar: user.avatar,
          status: user.status || 'online',
          role: 'Üye',
          roleColor: '#99AAB5'
        }]);
      }
    };

    const handleUserLeftServer = ({ userId, serverId }) => {
      if (serverId === server?._id || serverId === server?.id) {
        setMembers(prev => prev.filter(m => m.id !== userId && m._id !== userId));
      }
    };

    const handleNewMemberJoined = ({ serverId, member }) => {
      if (serverId === server?._id || serverId === server?.id) {
        // Add new member to the list
        const newMember = {
          id: member.user._id,
          _id: member.user._id,
          user: member.user,
          username: member.user.username,
          avatar: member.user.avatar,
          status: member.user.status || 'online',
          roles: member.roles,
          joinedAt: member.joinedAt,
          role: 'Üye',
          roleColor: '#99AAB5'
        };
        
        setMembers(prev => {
          // Check if member already exists to avoid duplicates
          const exists = prev.find(m => 
            (m.id === member.user._id || m._id === member.user._id) ||
            (m.user && (m.user._id === member.user._id || m.user.id === member.user._id))
          );
          
          if (!exists) {
            return [...prev, newMember];
          }
          return prev;
        });
      }
    };

    on('userStatusUpdate', handleUserStatusUpdate);
    on('userJoinedServer', handleUserJoinedServer);
    on('userLeftServer', handleUserLeftServer);
    on('newMemberJoined', handleNewMemberJoined);

    return () => {
      // Note: Socket service doesn't support cleanup yet
      // This is a known limitation
    };
  }, [server]); // Fixed: Removed 'on' dependency to prevent re-renders

  // Check if member is server owner
  const isServerOwner = (member) => {
    return server && (member.id === server.owner || member._id === server.owner);
  };

  // Check if member is admin
  const isAdmin = (member) => {
    return member.role === 'Admin' || member.role === 'Yönetici';
  };

  const onlineMembers = members.filter(m => m.status === "online" || m.status === "idle" || m.status === "dnd");
  const offlineMembers = members.filter(m => m.status === "offline" || m.status === "invisible");
  const onlineCount = onlineMembers.length;
  const offlineCount = offlineMembers.length;
  const totalCount = members.length;

  return (
    <>
      <div className="w-72 bg-black/30 backdrop-blur-md border-l border-white/10 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/10">
          <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
            Üyeler — {totalCount}
          </h3>
        </div>

        {/* Member List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-400">Üyeler yükleniyor...</span>
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-gray-400 text-sm">Bu sunucuda henüz üye yok</div>
            </div>
          ) : (
            <>
              {/* Online Members */}
              {onlineMembers.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-2">
                    Çevrimiçi — {onlineMembers.length}
                  </h4>
                  <div className="space-y-1">
                    {onlineMembers.map((member) => (
                      <div
                        key={member.id}
                        onClick={() => handleMemberClick(member)}
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer group transition-colors"
                      >
                        <div className="relative">
                          <Avatar className="w-8 h-8 ring-2 ring-white/10">
                            <AvatarImage src={null} alt={member.username} />
                            <AvatarFallback 
                              className="text-white text-sm font-medium"
                              style={{ backgroundColor: member.roleColor }}
                            >
                              {member.username.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div 
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-black/30 ${getStatusColor(member.user?.status || member.status || 'offline')}`}
                            title={getStatusText(member.user?.status || member.status || 'offline')}
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span 
                              className="text-sm font-medium truncate group-hover:text-white transition-colors"
                              style={{ color: member.roleColor }}
                            >
                              {member.displayName || member.username}
                            </span>
                            {(isServerOwner(member) || isAdmin(member)) && (
                              <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" title={isServerOwner(member) ? "Server Owner" : "Admin"} />
                            )}
                            {member.role !== "Üye" && member.role !== "Member" && !isServerOwner(member) && !isAdmin(member) && (
                              <Badge 
                                variant="secondary" 
                                className="text-xs px-1.5 py-0.5 bg-white/10 text-gray-300"
                              >
                                {member.role === "Admin" ? "Yönetici" : member.role === "Moderator" ? "Moderatör" : member.role}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Offline Members */}
              {offlineMembers.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-2">
                    Çevrimdışı — {offlineMembers.length}
                  </h4>
                  <div className="space-y-1">
                    {offlineMembers.map((member) => (
                      <div
                        key={member.id}
                        onClick={() => handleMemberClick(member)}
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer group transition-colors opacity-50"
                      >
                        <div className="relative">
                          <Avatar className="w-8 h-8 ring-2 ring-white/10 grayscale">
                            <AvatarImage src={null} alt={member.username} />
                            <AvatarFallback 
                              className="text-white text-sm font-medium bg-gray-600"
                            >
                              {member.username.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div 
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-black/30 ${getStatusColor(member.user?.status || member.status || 'offline')}`}
                            title={getStatusText(member.user?.status || member.status || 'offline')}
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-400 truncate group-hover:text-gray-300 transition-colors">
                              {member.displayName || member.username}
                            </span>
                            {(isServerOwner(member) || isAdmin(member)) && (
                              <Crown className="w-4 h-4 text-yellow-400 flex-shrink-0 opacity-75" title={isServerOwner(member) ? "Server Owner" : "Admin"} />
                            )}
                            {member.role !== "Üye" && member.role !== "Member" && !isServerOwner(member) && !isAdmin(member) && (
                              <Badge 
                                variant="secondary" 
                                className="text-xs px-1.5 py-0.5 bg-white/5 text-gray-400"
                              >
                                {member.role === "Admin" ? "Yönetici" : member.role === "Moderator" ? "Moderatör" : member.role}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
        user={selectedUser}
        currentUser={currentUser}
      />
    </>
  );
};

export default MemberList;