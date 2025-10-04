import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import {
  Crown,
  Plus,
  Trash2,
  Edit,
  Shield,
  MessageSquare,
  Users,
  Settings,
  Ban,
  UserX,
  Volume2,
  Hash,
  Palette,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from './ui/dialog';

const RoleManagement = ({ roles, onCreateRole, onUpdateRole, onDeleteRole, loading }) => {
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#5865F2');
  const [editingRole, setEditingRole] = useState(null);
  const [expandedRole, setExpandedRole] = useState(null);

  const defaultColors = [
    '#5865F2', // Discord Blurple
    '#57F287', // Green
    '#FEE75C', // Yellow
    '#EB459E', // Pink
    '#ED4245', // Red
    '#F26522', // Orange
    '#00D9FF', // Cyan
    '#9B59B6', // Purple
  ];

  const permissions = [
    { id: 'administrator', label: 'Yönetici', icon: Crown, description: 'Tüm izinler (tehlikeli!)' },
    { id: 'manageServer', label: 'Sunucuyu Yönet', icon: Settings, description: 'Sunucu ayarlarını değiştir' },
    { id: 'manageRoles', label: 'Rolleri Yönet', icon: Shield, description: 'Rol oluştur ve düzenle' },
    { id: 'manageChannels', label: 'Kanalları Yönet', icon: Hash, description: 'Kanal oluştur ve düzenle' },
    { id: 'kickMembers', label: 'Üyeleri At', icon: UserX, description: 'Üyeleri sunucudan at' },
    { id: 'banMembers', label: 'Üyeleri Yasakla', icon: Ban, description: 'Üyeleri yasakla' },
    { id: 'manageMessages', label: 'Mesajları Yönet', icon: MessageSquare, description: 'Mesajları sil ve düzenle' },
    { id: 'mentionEveryone', label: '@everyone Kullan', icon: Users, description: 'Herkesi etiketle' },
    { id: 'muteMembers', label: 'Üyeleri Sustur', icon: Volume2, description: 'Ses kanalında sustur' },
  ];

  const handleCreateRole = () => {
    if (!newRoleName.trim()) return;
    
    onCreateRole({
      name: newRoleName,
      color: newRoleColor,
      permissions: {}
    });
    
    setNewRoleName('');
    setNewRoleColor('#5865F2');
  };

  const handleUpdatePermission = async (roleId, permissionId, value) => {
    const role = roles.find(r => r._id === roleId);
    if (!role) return;

    const updatedPermissions = {
      ...(role.permissions || {}),
      [permissionId]: value
    };

    // Optimistic update
    const updatedRoles = roles.map(r => 
      r._id === roleId 
        ? { ...r, permissions: updatedPermissions }
        : r
    );
    
    await onUpdateRole(roleId, { permissions: updatedPermissions });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Crown className="w-6 h-6 text-yellow-400" />
          Roller
        </h2>
        <p className="text-gray-400">Sunucu rollerini oluşturun ve izinlerini yönetin</p>
      </div>

      {/* Create Role */}
      <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-lg p-6 border border-blue-500/20">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Yeni Rol Oluştur
        </h3>
        
        <div className="space-y-4">
          <div>
            <Label className="text-gray-300 mb-2">Rol Adı</Label>
            <Input
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="Örn: Moderatör"
              className="bg-black/30 border-white/20 text-white"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateRole()}
            />
          </div>

          <div>
            <Label className="text-gray-300 mb-2 flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Rol Rengi
            </Label>
            <div className="flex items-center gap-3">
              <div className="flex gap-2 flex-wrap">
                {defaultColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewRoleColor(color)}
                    className={`w-10 h-10 rounded-lg transition-all hover:scale-110 ${
                      newRoleColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''
                    }`}
                    style={{
                      backgroundColor: color,
                      boxShadow: newRoleColor === color ? `0 0 20px ${color}80` : 'none'
                    }}
                  />
                ))}
              </div>
              <input
                type="color"
                value={newRoleColor}
                onChange={(e) => setNewRoleColor(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer bg-transparent"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <div
              className="px-4 py-2 rounded-lg font-semibold transition-all"
              style={{
                backgroundColor: `${newRoleColor}20`,
                color: newRoleColor,
                border: `1px solid ${newRoleColor}40`,
                boxShadow: `0 0 15px ${newRoleColor}30`
              }}
            >
              {newRoleName || 'Yeni Rol'}
            </div>
            <Button
              onClick={handleCreateRole}
              disabled={!newRoleName.trim() || loading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Rol Oluştur
            </Button>
          </div>
        </div>
      </div>

      {/* Roles List */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-300">Mevcut Roller ({roles?.length || 0})</h3>
        
        {roles && roles.length > 0 ? (
          <div className="space-y-2">
            {roles.map((role) => (
              <div
                key={role._id}
                className="group bg-black/40 backdrop-blur-sm rounded-lg border transition-all hover:scale-[1.01]"
                style={{
                  borderColor: `${role.color}40`,
                  boxShadow: expandedRole === role._id ? `0 0 20px ${role.color}30` : 'none'
                }}
              >
                {/* Role Header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedRole(expandedRole === role._id ? null : role._id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full animate-pulse"
                        style={{
                          backgroundColor: role.color,
                          boxShadow: `0 0 10px ${role.color}`
                        }}
                      />
                      <span
                        className="font-semibold text-lg"
                        style={{ color: role.color }}
                      >
                        {role.name}
                      </span>
                      {role.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          Varsayılan
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!role.isDefault && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingRole(role);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteRole(role._id);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {expandedRole === role._id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Role Permissions (Expanded) */}
                {expandedRole === role._id && (
                  <div className="px-4 pb-4 border-t border-white/10 pt-4">
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">İzinler</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {permissions.map((permission) => {
                        const Icon = permission.icon;
                        const hasPermission = role.permissions?.[permission.id] || false;
                        
                        return (
                          <div
                            key={permission.id}
                            className={`p-3 rounded-lg border transition-all ${
                              hasPermission
                                ? 'bg-green-500/10 border-green-500/30'
                                : 'bg-white/5 border-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Icon className={`w-4 h-4 ${hasPermission ? 'text-green-400' : 'text-gray-400'}`} />
                                <div>
                                  <p className={`text-sm font-medium ${hasPermission ? 'text-green-400' : 'text-gray-300'}`}>
                                    {permission.label}
                                  </p>
                                  <p className="text-xs text-gray-500">{permission.description}</p>
                                </div>
                              </div>
                              <Switch
                                checked={hasPermission}
                                onCheckedChange={(checked) => handleUpdatePermission(role._id, permission.id, checked)}
                                disabled={role.isDefault}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-8 border border-dashed border-white/20 text-center">
            <Crown className="w-12 h-12 mx-auto mb-3 text-gray-500" />
            <p className="text-gray-400">Henüz rol oluşturulmadı</p>
            <p className="text-gray-500 text-sm mt-1">Yukarıdaki formu kullanarak yeni bir rol oluşturun</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleManagement;
