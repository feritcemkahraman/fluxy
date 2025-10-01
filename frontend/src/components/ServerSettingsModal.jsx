import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { 
  X, 
  Settings, 
  Users, 
  Shield, 
  Hash, 
  Volume2, 
  Crown,
  Edit,
  Trash2,
  Plus,
  Camera,
  UserPlus,
  Ban,
  MoreVertical,
  Search,
  Filter,
  UserX,
  UserCheck,
  Copy,
  MessageSquare,
  Phone,
  Video,
  UserMinus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  LogOut
} from "lucide-react";
import { roleAPI, serverAPI, channelAPI, uploadAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const ServerSettingsModal = ({ isOpen, onClose, server, onServerUpdate }) => {
  const { user } = useAuth();
  
  // Get consistent server ID (handles both _id and id formats)
  const serverId = server?._id || server?.id;
  
  const [serverSettings, setServerSettings] = useState({
    name: server?.name || "",
    description: server?.description || "",
    icon: server?.icon || "",
    region: server?.region || "auto",
    verificationLevel: server?.verificationLevel || "medium",
    explicitContentFilter: server?.explicitContentFilter || "members_without_roles",
    defaultNotifications: server?.defaultNotifications || "only_mentions"
  });

  const [roles, setRoles] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [editingRole, setEditingRole] = useState(null);
  const fileInputRef = useRef(null);

  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState("text");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Members management states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberActionDialog, setMemberActionDialog] = useState({ open: false, action: '', member: null });
  const [inviteLink, setInviteLink] = useState("");
  const [memberRoleAssignments, setMemberRoleAssignments] = useState({});
  const [kickReason, setKickReason] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState("permanent");

  const verificationLevels = [
    { value: "none", label: "Yok", description: "Kısıtlama yok" },
    { value: "low", label: "Düşük", description: "Fluxy'de doğrulanmış e-posta gerekli" },
    { value: "medium", label: "Orta", description: "Fluxy'de 5 dakikadan uzun süre kayıtlı olmalı" },
    { value: "high", label: "Yüksek", description: "Sunucuda 10 dakikadan uzun süre üye olmalı" },
    { value: "very_high", label: "Çok Yüksek", description: "Doğrulanmış telefon numarası gerekli" }
  ];

  const handleKickMember = async (memberId) => {
    try {
      await serverAPI.kickMember(serverId, memberId);
      loadMembers();
    } catch (error) {
      // Error handled silently or could show toast
    }
  };

  const handleBanMember = async (memberId) => {
    try {
      await serverAPI.banMember(serverId, memberId, { reason: banReason || 'Banned by admin' });
      loadMembers();
      setMemberActionDialog({ open: false, action: '', member: null });
      setBanReason("");
    } catch (error) {
      // Error handled silently or could show toast
    }
  };

  // New member management functions
  const handleKickMemberWithReason = async (memberId) => {
    try {
      await serverAPI.kickMember(serverId, memberId, { reason: kickReason || 'Kicked by admin' });
      loadMembers();
      setMemberActionDialog({ open: false, action: '', member: null });
      setKickReason("");
    } catch (error) {
      // console.error('Failed to kick member:', error);
    }
  };

  const handleAssignRole = async (memberId, roleId) => {
    try {
      await roleAPI.assignRole(roleId, memberId, serverId);
      loadMembers();
    } catch (error) {
      // console.error('Failed to assign role:', error);
    }
  };

  const handleRemoveRole = async (memberId, roleId) => {
    try {
      await roleAPI.removeRole(roleId, memberId, serverId);
      loadMembers();
    } catch (error) {
      // console.error('Failed to remove role:', error);
    }
  };

  const generateInviteLink = async () => {
    try {
      const response = await serverAPI.createInvite(serverId);
      setInviteLink(response.data.inviteCode);
    } catch (error) {
      console.error('Failed to generate invite:', error);
    }
  };

  const copyInviteCode = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast.success('Davet kodu kopyalandı!');
    }
  };

  const openMemberActionDialog = (action, member) => {
    setMemberActionDialog({ open: true, action, member });
  };

  const getFilteredMembers = () => {
    let filtered = members || [];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(member => 
        member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Role filter
    if (filterRole !== "all") {
      filtered = filtered.filter(member => {
        if (filterRole === "no-role") {
          return !member.roles || member.roles.length === 0;
        }
        return member.roles?.includes(filterRole);
      });
    }
    
    return filtered;
  };

  const getMemberRoles = (member) => {
    if (!member.roles || !roles) return [];
    return member.roles
      .map(roleId => roles.find(r => r._id === roleId))
      .filter(Boolean);
  };

  const getMemberHighestRole = (member) => {
    const memberRoles = getMemberRoles(member);
    if (memberRoles.length === 0) return null;
    
    // Sort by position (higher position = more important)
    return memberRoles.sort((a, b) => (b.position || 0) - (a.position || 0))[0];
  };

  const canManageMember = (member) => {
    // Owner can manage everyone
    if (server.owner === member.userId) return false;
    
    // Check if current user has permission to manage this member
    // This would need proper permission checking logic
    return true;
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;

    try {
      setLoading(true);
      await channelAPI.createChannel({
        name: newChannelName,
        type: newChannelType,
        serverId: server.id
      });
      setNewChannelName("");
      if (onServerUpdate) {
        onServerUpdate(server);
      }
    } catch (error) {
      // console.error('Failed to create channel:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleIconUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      // Alert notification removed as requested
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      // Alert notification removed as requested
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'server-icon');
      
      const response = await uploadAPI.uploadFile(formData);
      
      if (response.data && response.data.url) {
        setServerSettings(prev => ({ ...prev, icon: response.data.url }));
      }
    } catch (error) {
      // console.error('Upload failed:', error);
      // Alert notification removed as requested
    } finally {
      setLoading(false);
    }
  };

  const handleIconClick = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    if (isOpen && server?.id) {
      loadRoles();
      loadMembers();
      setInviteLink(""); // Clear invite link when server changes
    }
  }, [isOpen, server?.id]);

  useEffect(() => {
    if (!isOpen) {
      setDeleteConfirmText("");
      setDeleteLoading(false);
      setInviteLink(""); // Clear invite link when modal closes
    }
  }, [isOpen]);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await roleAPI.getRoles(serverId);
      setRoles(response.data);
    } catch (error) {
      // console.error('Failed to load roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const response = await serverAPI.getServerMembers(serverId);
      setMembers(response.data.members);
    } catch (error) {
      // console.error('Failed to load members:', error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await serverAPI.updateServer(serverId, serverSettings);
      onServerUpdate(response.data);
      onClose();
    } catch (error) {
      // console.error('Failed to save server settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;

    try {
      setLoading(true);
      await roleAPI.createRole(serverId, {
        name: newRoleName,
        color: '#99aab5',
        permissions: {}
      });
      setNewRoleName('');
      loadRoles();
    } catch (error) {
      // console.error('Failed to create role:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (roleId) => {
    try {
      await roleAPI.deleteRole(roleId);
      loadRoles();
    } catch (error) {
      // console.error('Failed to delete role:', error);
    }
  };

  const handleChangeRole = async (memberId, roleId, action) => {
    try {
      if (action === 'add') {
        await roleAPI.assignRole(roleId, memberId, serverId);
      } else {
        await roleAPI.removeRole(roleId, memberId, serverId);
      }
      loadMembers();
    } catch (error) {
      // console.error('Failed to change role:', error);
    }
  };

  const handleDeleteServer = async () => {
    if (deleteConfirmText !== server?.name) {
      return;
    }

    try {
      setDeleteLoading(true);
      await serverAPI.deleteServer(serverId);
      
      onClose();
      
      if (onServerUpdate) {
        onServerUpdate({ type: 'delete', serverId });
      }
      
      setDeleteConfirmText("");
    } catch (error) {
      // console.error('Failed to delete server:', error);
      // Alert notification removed as requested
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLeaveServer = async () => {
    try {
      setDeleteLoading(true);
      await serverAPI.leaveServer(serverId);
      
      onClose();
      
      if (onServerUpdate) {
        onServerUpdate({ type: 'leave', serverId });
      }
      
      toast.success('Sunucudan başarıyla ayrıldınız');
    } catch (error) {
      console.error('Failed to leave server:', error);
      toast.error('Sunucudan ayrılırken bir hata oluştu');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Check if current user is server owner
  const isServerOwner = server?.owner === user?._id || server?.owner === user?.id;

  if (!server) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[80vh] bg-black/90 backdrop-blur-xl border border-white/20 text-white p-0">
        <div className="flex h-full">
          <Tabs defaultValue="overview" orientation="vertical" className="flex w-full">
            {/* Sidebar */}
            <div className="w-80 bg-black/50 backdrop-blur-md border-r border-white/10 p-4">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-xl font-bold text-white">
                  Sunucu Ayarları
                </DialogTitle>
                <DialogDescription className="text-gray-400 text-sm">
                  {server?.name} sunucusunu yönetin
                </DialogDescription>
              </DialogHeader>
              
              <TabsList className="flex flex-col h-auto space-y-3 bg-transparent">
                {/* Overview - Everyone can see */}
                <TabsTrigger 
                  value="overview" 
                  className="w-full justify-start text-left text-lg data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400 hover:text-white hover:bg-white/5"
                >
                  <Settings className="w-5 h-5 mr-3" />
                  Genel Bakış
                </TabsTrigger>
                
                {/* Members - Everyone can see */}
                <TabsTrigger 
                  value="members" 
                  className="w-full justify-start text-left text-lg data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400 hover:text-white hover:bg-white/5"
                >
                  <Users className="w-5 h-5 mr-3" />
                  Üyeler
                </TabsTrigger>
                
                {/* Owner-only tabs */}
                {isServerOwner && (
                  <>
                    <TabsTrigger 
                      value="channels" 
                      className="w-full justify-start text-left text-lg data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400 hover:text-white hover:bg-white/5"
                    >
                      <Hash className="w-5 h-5 mr-3" />
                      Kanallar
                    </TabsTrigger>
                    <TabsTrigger 
                      value="roles" 
                      className="w-full justify-start text-left text-lg data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400 hover:text-white hover:bg-white/5"
                    >
                      <Crown className="w-5 h-5 mr-3" />
                      Roller
                    </TabsTrigger>
                    <TabsTrigger 
                      value="moderation" 
                      className="w-full justify-start text-left text-lg data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400 hover:text-white hover:bg-white/5"
                    >
                      <Shield className="w-5 h-5 mr-3" />
                      Moderasyon
                    </TabsTrigger>
                  </>
                )}
                
                {/* Leave/Delete Server */}
                <TabsTrigger 
                  value="delete" 
                  className="w-full justify-start text-left text-lg data-[state=active]:bg-red-600/20 data-[state=active]:text-red-400 text-gray-400 hover:text-red-400 hover:bg-red-600/10"
                >
                  {isServerOwner ? (
                    <>
                      <Trash2 className="w-5 h-5 mr-3" />
                      Sunucu Sil
                    </>
                  ) : (
                    <>
                      <LogOut className="w-5 h-5 mr-3" />
                      Sunucudan Ayrıl
                    </>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Main Content */}
            <div className="flex-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
              {/* Overview Tab */}
              <TabsContent value="overview" className="p-6 space-y-6 overflow-y-auto max-h-[calc(80vh-8rem)]">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Sunucu Genel Bakış</h2>
                  <p className="text-gray-400">Sunucunuzun temel bilgilerini ve ayarlarını yönetin.</p>
                </div>

                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="relative group">
                      <Avatar className="w-20 h-20 ring-4 ring-white/20">
                        <AvatarImage 
                          src={serverSettings.icon} 
                          alt={serverSettings.name}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-2xl">
                          {serverSettings.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleIconClick}
                        disabled={loading}
                        className="absolute inset-0 w-full h-full rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Camera className="w-6 h-6 text-white" />
                      </Button>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white">
                        {serverSettings.name}
                      </h3>
                      <div className="flex items-center space-x-4 mt-2">
                        <Badge variant="secondary" className="bg-white/10 text-gray-300">
                          {server.members?.length || 0} üye
                        </Badge>
                        <Badge variant="secondary" className="bg-white/10 text-gray-300">
                          {server.onlineCount || 0} çevrimiçi
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleIconUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="serverName" className="text-gray-300">Sunucu Adı</Label>
                      <Input
                        id="serverName"
                        value={serverSettings.name}
                        onChange={(e) => setServerSettings(prev => ({ ...prev, name: e.target.value }))}
                        className="mt-1 bg-black/30 border-white/20 text-white"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="serverDescription" className="text-gray-300">Sunucu Açıklaması</Label>
                      <Textarea
                        id="serverDescription"
                        value={serverSettings.description}
                        onChange={(e) => setServerSettings(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Sunucunuzu açıklayın..."
                        className="mt-1 bg-black/30 border-white/20 text-white"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleSave} 
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </Button>
              </TabsContent>

              {/* Channels Tab */}
              <TabsContent value="channels" className="p-6 space-y-6 overflow-y-auto max-h-[calc(80vh-8rem)]">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Kanallar</h2>
                  <p className="text-gray-400">Sunucunuzun metin ve ses kanallarını yönetin.</p>
                </div>

                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                  <h3 className="text-lg font-semibold mb-4">Yeni Kanal Oluştur</h3>
                  <div className="flex space-x-4">
                    <Input
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      placeholder="Kanal adı"
                      className="flex-1 bg-black/30 border-white/20 text-white"
                    />
                    <Select value={newChannelType} onValueChange={setNewChannelType}>
                      <SelectTrigger className="w-40 bg-black/30 border-white/20 text-white">
                        <SelectValue placeholder="Kanal türü" />
                      </SelectTrigger>
                      <SelectContent className="bg-black/90 border-white/20 text-white">
                        <SelectItem value="text" className="focus:bg-white/10 focus:text-white">📝 Metin Kanalı</SelectItem>
                        <SelectItem value="voice" className="focus:bg-white/10 focus:text-white">🔊 Ses Kanalı</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleCreateChannel} disabled={loading || !newChannelName.trim()} className="bg-green-600 hover:bg-green-700">
                      {loading ? 'Oluşturuluyor...' : 'Oluştur'}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Members Tab */}
              <TabsContent value="members" className="p-6 space-y-6 overflow-y-auto max-h-[calc(80vh-8rem)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Üyeler</h2>
                    <p className="text-gray-400">Sunucu üyelerini ve izinlerini yönetin.</p>
                  </div>
                  <Button onClick={generateInviteLink} className="bg-blue-600 hover:bg-blue-700">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Davet Oluştur
                  </Button>
                </div>

                {/* Invite Link Section */}
                {inviteLink && (
                  <div className="bg-blue-900/20 backdrop-blur-sm rounded-lg p-4 border border-blue-500/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-blue-400 font-medium">Davet Kodu</h4>
                        <p className="text-white text-lg font-mono tracking-wider">{inviteLink}</p>
                      </div>
                      <Button onClick={copyInviteCode} variant="outline" size="sm">
                        <Copy className="w-4 h-4 mr-2" />
                        Kopyala
                      </Button>
                    </div>
                  </div>
                )}

                {/* Search and Filter */}
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Üye ara..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 bg-black/30 border-white/20 text-white"
                        />
                      </div>
                    </div>
                    <div className="w-full md:w-48">
                      <Select value={filterRole} onValueChange={setFilterRole}>
                        <SelectTrigger className="bg-black/30 border-white/20 text-white">
                          <Filter className="w-4 h-4 mr-2" />
                          <SelectValue placeholder="Rol filtrele" />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 border-white/20 text-white">
                          <SelectItem value="all" className="focus:bg-white/10 focus:text-white">👥 Tüm Üyeler</SelectItem>
                          <SelectItem value="no-role" className="focus:bg-white/10 focus:text-white">❓ Rolsüz Üyeler</SelectItem>
                          {roles.map(role => (
                            <SelectItem key={role._id} value={role._id} className="focus:bg-white/10 focus:text-white">
                              <div className="flex items-center">
                                <div 
                                  className="w-3 h-3 rounded mr-2" 
                                  style={{ backgroundColor: role.color }}
                                />
                                {role.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Members List */}
                <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
                  <div className="p-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold">
                      Üyeler ({getFilteredMembers().length}/{members?.length || 0})
                    </h3>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {getFilteredMembers().length === 0 ? (
                      <div className="p-8 text-center text-gray-400">
                        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Arama kriterlerinize uygun üye bulunamadı.</p>
                      </div>
                    ) : (
                      getFilteredMembers().map((member) => {
                        const highestRole = getMemberHighestRole(member);
                        const memberRoles = getMemberRoles(member);
                        const isOwner = server.owner === member.userId;
                        
                        return (
                          <div key={member.id || member._id} className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3 flex-1">
                                <div className="relative">
                                  <Avatar className="w-12 h-12">
                                    <AvatarFallback 
                                      className="text-white"
                                      style={{ backgroundColor: highestRole?.color || '#6b7280' }}
                                    >
                                      {(member.displayName || member.username).charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  
                                  {/* Online Status */}
                                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black ${
                                    member.status === 'online' ? 'bg-green-500' :
                                    member.status === 'idle' ? 'bg-yellow-500' :
                                    member.status === 'dnd' ? 'bg-red-500' : 'bg-gray-500'
                                  }`} />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <span 
                                      className="font-medium truncate"
                                      style={{ color: highestRole?.color || '#ffffff' }}
                                    >
                                      {member.displayName || member.username}
                                    </span>
                                    {isOwner && (
                                      <Crown className="w-4 h-4 text-yellow-500" title="Sunucu Sahibi" />
                                    )}
                                    {member.isBot && (
                                      <Badge variant="secondary" className="text-xs bg-blue-600/20 text-blue-400">
                                        BOT
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {memberRoles.length > 0 ? (
                                      memberRoles.slice(0, 3).map(role => (
                                        <Badge 
                                          key={role._id}
                                          variant="secondary" 
                                          className="text-xs px-2"
                                          style={{ 
                                            backgroundColor: `${role.color}20`,
                                            color: role.color,
                                            borderColor: `${role.color}40`
                                          }}
                                        >
                                          {role.name}
                                        </Badge>
                                      ))
                                    ) : (
                                      <Badge variant="secondary" className="text-xs bg-gray-600/20 text-gray-400">
                                        Rol yok
                                      </Badge>
                                    )}
                                    {memberRoles.length > 3 && (
                                      <Badge variant="secondary" className="text-xs bg-gray-600/20 text-gray-400">
                                        +{memberRoles.length - 3}
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <p className="text-xs text-gray-400 mt-1">
                                    Katıldı: {new Date(member.joinedAt).toLocaleDateString('tr-TR')}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Member Actions */}
                              {canManageMember(member) && !isOwner && (
                                <div className="flex items-center space-x-2">
                                  {/* Role Assignment */}
                                  <Select onValueChange={(roleId) => handleAssignRole(member.id || member._id, roleId)}>
                                    <SelectTrigger className="w-32 h-8 text-xs bg-black/30 border-white/20">
                                      <Plus className="w-3 h-3 mr-1" />
                                      <SelectValue placeholder="Rol Ver" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-black/90 border-white/20 text-white">
                                      {roles.filter(role => 
                                        !role.isDefault && 
                                        !memberRoles.some(mr => mr._id === role._id)
                                      ).map(role => (
                                        <SelectItem key={role._id} value={role._id} className="focus:bg-white/10 focus:text-white">
                                          <div className="flex items-center">
                                            <div 
                                              className="w-3 h-3 rounded mr-2" 
                                              style={{ backgroundColor: role.color }}
                                            />
                                            {role.name}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  {/* More Actions Dropdown */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="w-4 h-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuItem 
                                        onClick={() => {/* Open DM */}}
                                        className="text-blue-400 hover:text-blue-300"
                                      >
                                        <MessageSquare className="w-4 h-4 mr-2" />
                                        Mesaj Gönder
                                      </DropdownMenuItem>
                                      
                                      <DropdownMenuSeparator />
                                      
                                      {memberRoles.length > 0 && (
                                        <DropdownMenuItem 
                                          onClick={() => {
                                            // Remove all roles
                                            memberRoles.forEach(role => {
                                              handleRemoveRole(member.id || member._id, role._id);
                                            });
                                          }}
                                          className="text-yellow-400 hover:text-yellow-300"
                                        >
                                          <UserMinus className="w-4 h-4 mr-2" />
                                          Tüm Rolleri Kaldır
                                        </DropdownMenuItem>
                                      )}
                                      
                                      <DropdownMenuSeparator />
                                      
                                      <DropdownMenuItem 
                                        onClick={() => openMemberActionDialog('kick', member)}
                                        className="text-orange-400 hover:text-orange-300"
                                      >
                                        <UserX className="w-4 h-4 mr-2" />
                                        Sunucudan At
                                      </DropdownMenuItem>
                                      
                                      <DropdownMenuItem 
                                        onClick={() => openMemberActionDialog('ban', member)}
                                        className="text-red-400 hover:text-red-300"
                                      >
                                        <Ban className="w-4 h-4 mr-2" />
                                        Yasakla
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Member Action Confirmation Dialogs */}
                <AlertDialog open={memberActionDialog.open} onOpenChange={(open) => 
                  setMemberActionDialog({ open, action: '', member: null })
                }>
                  <AlertDialogContent className="bg-black/90 border border-white/20">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">
                        {memberActionDialog.action === 'kick' ? 'Üyeyi Sunucudan At' : 'Üyeyi Yasakla'}
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-400">
                        {memberActionDialog.action === 'kick' 
                          ? `${memberActionDialog.member?.username} kullanıcısını sunucudan atmak istediğinizden emin misiniz?`
                          : `${memberActionDialog.member?.username} kullanıcısını sunucudan yasaklamak istediğinizden emin misiniz?`
                        }
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    
                    <div className="my-4">
                      <Label className="text-gray-300">
                        {memberActionDialog.action === 'kick' ? 'Atma Sebebi' : 'Yasaklama Sebebi'}
                      </Label>
                      <Textarea
                        value={memberActionDialog.action === 'kick' ? kickReason : banReason}
                        onChange={(e) => {
                          if (memberActionDialog.action === 'kick') {
                            setKickReason(e.target.value);
                          } else {
                            setBanReason(e.target.value);
                          }
                        }}
                        placeholder="İsteğe bağlı..."
                        className="mt-1 bg-black/30 border-white/20 text-white"
                        rows={2}
                      />
                    </div>

                    {memberActionDialog.action === 'ban' && (
                      <div className="mb-4">
                        <Label className="text-gray-300">Yasaklama Süresi</Label>
                        <Select value={banDuration} onValueChange={setBanDuration}>
                          <SelectTrigger className="mt-1 bg-black/30 border-white/20 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-black/90 border-white/20 text-white">
                            <SelectItem value="permanent" className="focus:bg-white/10 focus:text-white">♾️ Kalıcı</SelectItem>
                            <SelectItem value="1d" className="focus:bg-white/10 focus:text-white">⏰ 1 Gün</SelectItem>
                            <SelectItem value="7d" className="focus:bg-white/10 focus:text-white">📅 7 Gün</SelectItem>
                            <SelectItem value="30d" className="focus:bg-white/10 focus:text-white">📆 30 Gün</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">
                        İptal
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          if (memberActionDialog.action === 'kick') {
                            handleKickMemberWithReason(memberActionDialog.member.id || memberActionDialog.member._id);
                          } else {
                            handleBanMember(memberActionDialog.member.id || memberActionDialog.member._id);
                          }
                        }}
                        className={`${
                          memberActionDialog.action === 'kick' 
                            ? 'bg-orange-600 hover:bg-orange-700' 
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        {memberActionDialog.action === 'kick' ? 'Sunucudan At' : 'Yasakla'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TabsContent>

              {/* Roles Tab */}
              <TabsContent value="roles" className="p-6 space-y-6 overflow-y-auto max-h-[calc(80vh-8rem)]">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Roller</h2>
                  <p className="text-gray-400">Sunucu rollerini ve izinlerini oluşturun ve yönetin.</p>
                </div>

                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                  <div className="flex items-center space-x-2">
                    <Input
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      placeholder="Rol adı"
                      className="bg-black/30 border-white/20 text-white"
                    />
                    <Button
                      onClick={handleCreateRole}
                      disabled={!newRoleName.trim() || loading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? 'Oluşturuluyor...' : 'Rol Oluştur'}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Moderation Tab */}
              <TabsContent value="moderation" className="p-6 space-y-6 overflow-y-auto max-h-[calc(80vh-8rem)]">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Moderasyon</h2>
                  <p className="text-gray-400">Sunucu güvenliği ve moderasyon ayarlarını yapılandırın.</p>
                </div>

                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                  <h3 className="text-lg font-semibold mb-4">Doğrulama Seviyesi</h3>
                  <div className="space-y-3">
                    {verificationLevels.map((level) => (
                      <div 
                        key={level.value}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          serverSettings.verificationLevel === level.value
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-white/20 bg-white/5 hover:border-white/30"
                        }`}
                        onClick={() => setServerSettings(prev => ({ ...prev, verificationLevel: level.value }))}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">{level.label}</span>
                          {serverSettings.verificationLevel === level.value && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                        </div>
                        <p className="text-gray-400 text-sm mt-1">{level.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Delete Server / Leave Server Tab */}
              <TabsContent value="delete" className="p-6 space-y-6 overflow-y-auto max-h-[calc(80vh-8rem)]">
                {isServerOwner ? (
                  <>
                    <div>
                      <h2 className="text-2xl font-bold mb-2 text-red-400">Sunucu Sil</h2>
                      <p className="text-gray-400">Bu işlem geri alınamaz. Sunucu ve tüm verileri kalıcı olarak silinecektir.</p>
                    </div>

                    <div className="bg-red-900/20 backdrop-blur-sm rounded-lg p-6 border border-red-500/30">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center">
                            <Trash2 className="w-5 h-5 text-red-400" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-red-400 mb-2">Dikkat: Bu İşlem Geri Alınamaz</h3>
                          <p className="text-gray-300 mb-4">Bu sunucuyu sildiğinizde:</p>
                          <ul className="text-gray-300 space-y-1 mb-6">
                            <li className="flex items-center">
                              <div className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2"></div>
                              Tüm kanallar ve mesajlar silinecek
                            </li>
                            <li className="flex items-center">
                              <div className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2"></div>
                              Tüm üye bilgileri ve rolleri silinecek
                            </li>
                            <li className="flex items-center">
                              <div className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2"></div>
                              Yüklenen dosyalar ve medya silinecek
                            </li>
                            <li className="flex items-center">
                              <div className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2"></div>
                              Sunucu ayarları ve geçmişi silinecek
                            </li>
                          </ul>
                          
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="serverNameConfirm" className="text-gray-300">
                                Silmek için sunucu adını yazın: <span className="text-white font-mono">{server?.name}</span>
                              </Label>
                              <Input
                                id="serverNameConfirm"
                                type="text"
                                placeholder={server?.name}
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                className="mt-2 bg-black/30 border-red-500/30 focus:border-red-500 text-white placeholder-gray-500"
                              />
                            </div>
                            
                            <Button
                              onClick={handleDeleteServer}
                              disabled={deleteConfirmText !== server?.name || deleteLoading}
                              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deleteLoading ? 'Siliniyor...' : 'Sunucuyu Kalıcı Olarak Sil'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h2 className="text-2xl font-bold mb-2 text-red-400">Sunucudan Ayrıl</h2>
                      <p className="text-gray-400">
                        <span className="font-semibold text-white">{server?.name}</span> sunucusundan ayrılmak istediğinize emin misiniz?
                      </p>
                    </div>

                    <div className="bg-red-900/20 backdrop-blur-sm rounded-lg p-6 border border-red-500/30">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center">
                            <LogOut className="w-5 h-5 text-red-400" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-red-400 mb-2">Sunucudan Ayrılma</h3>
                          <p className="text-gray-300 mb-4">Bu sunucudan ayrıldığınızda:</p>
                          <ul className="text-gray-300 space-y-2 mb-6">
                            <li className="flex items-center">
                              <div className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2"></div>
                              Sunucu kanallarına erişiminiz kaldırılacak
                            </li>
                            <li className="flex items-center">
                              <div className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2"></div>
                              Sunucu üyelerini göremeyeceksiniz
                            </li>
                            <li className="flex items-center">
                              <div className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2"></div>
                              Tekrar katılmak için Davet Kodu gerekecek
                            </li>
                          </ul>
                          
                          <div className="flex gap-3">
                            <Button
                              onClick={onClose}
                              variant="outline"
                              className="flex-1 border-white/20 text-white hover:bg-white/10"
                            >
                              İptal
                            </Button>
                            <Button
                              onClick={handleLeaveServer}
                              disabled={deleteLoading}
                              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50"
                            >
                              {deleteLoading ? 'Ayrılınıyor...' : 'Sunucudan Ayrıl'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ServerSettingsModal;
