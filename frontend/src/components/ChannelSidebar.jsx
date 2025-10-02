import React, { useState } from "react";
import { Button } from "./ui/button";
import { ChevronDown, ChevronRight, Hash, Volume2, Plus, Settings, UserPlus, Edit, Trash2, MoreHorizontal, Mic, MicOff, Headphones, HeadphonesIcon, VolumeX } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Badge } from "./ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import ServerSettingsModal from "./ServerSettingsModal";
import CreateChannelModal from "./CreateChannelModal";
import VoiceParticipantList from "./VoiceParticipantList";
import { channelAPI } from '../services/api';
import { toast } from "sonner";
import { useAudio } from "../hooks/useAudio";

const ChannelSidebar = ({ server, activeChannel, voiceChannelParticipants, onChannelSelect, onChannelCreated, onServerUpdate, onVoiceChannelJoin, currentVoiceChannel, isVoiceConnected, isMuted, isDeafened, user }) => {
  const [expandedCategories, setExpandedCategories] = useState(new Set(["text", "voice"]));
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState(null);
  const [editingChannel, setEditingChannel] = useState(null);
  const [editChannelName, setEditChannelName] = useState('');
  
  const { playVoiceJoin } = useAudio();

  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const textChannels = server?.channels?.filter(c => c.type === "text") || [];
  const voiceChannels = server?.channels?.filter(c => c.type === "voice") || [];

  const handleVoiceChannelSelect = async (channel) => {
    // Ses efekti çal
    if (channel.type === 'voice') {
      try {
        await playVoiceJoin();
      } catch (error) {
        console.warn('Failed to play voice join sound:', error);
      }
    }
    onChannelSelect(channel);
  };

  const handleServerUpdate = (updatedServer) => {
    // Pass the server update to parent component
    if (onServerUpdate) {
      onServerUpdate(updatedServer);
    }
  };

  const handleChannelCreated = (newChannel) => {
    onChannelCreated?.(newChannel);
    setShowCreateChannelModal(false);
  };

  const handleDeleteChannel = (channel) => {
    setChannelToDelete(channel);
    setDeleteDialogOpen(true);
  };

  const handleEditChannel = (channel) => {
    setEditingChannel(channel);
    setEditChannelName(channel.name);
  };

  const saveChannelEdit = async () => {
    if (!editingChannel || !editChannelName.trim()) return;

    try {
      setLoading(true);
      await channelAPI.updateChannel(editingChannel._id || editingChannel.id, { name: editChannelName.trim() });
      toast.success(`"${editingChannel.name}" kanalı "${editChannelName.trim()}" olarak güncellendi!`);

      // Refresh server data
      if (onServerUpdate) {
        const updatedChannels = server.channels.map(c => 
          (c._id || c.id) === (editingChannel._id || editingChannel.id) 
            ? { ...c, name: editChannelName.trim() } 
            : c
        );
        onServerUpdate({ ...server, channels: updatedChannels });
      }
    } catch (error) {
      console.error('Update channel error:', error);
      toast.error(`Kanal güncellenirken bir hata oluştu: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
      setEditingChannel(null);
      setEditChannelName('');
    }
  };

  const cancelChannelEdit = () => {
    setEditingChannel(null);
    setEditChannelName('');
  };

  const confirmDeleteChannel = async () => {
    if (!channelToDelete) return;

    try {
      setLoading(true);
      await channelAPI.deleteChannel(channelToDelete._id || channelToDelete.id);
      toast.success(`"${channelToDelete.name}" kanalı başarıyla silindi!`);

      // Refresh server data
      if (onServerUpdate) {
        const updatedChannels = server.channels.filter(c => (c._id || c.id) !== (channelToDelete._id || channelToDelete.id));
        onServerUpdate({ ...server, channels: updatedChannels });
      }
    } catch (error) {
      console.error('Delete channel error:', error);
      toast.error(`Kanal silinirken bir hata oluştu: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setChannelToDelete(null);
    }
  };

  if (!server) {
    return (
      <div className="w-72 bg-black/40 backdrop-blur-md border-r border-white/10 flex items-center justify-center">
        <p className="text-gray-400">Select a server</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-72 bg-black/40 backdrop-blur-md border-r border-white/10 flex flex-col">
        {/* Server Header */}
        <div className="p-5 border-b border-white/10">
          <Button
            variant="ghost"
            onClick={() => setIsServerSettingsOpen(true)}
            className="w-full justify-between hover:bg-white/10 transition-colors"
          >
            <div className="text-left">
              <h2 className="text-white font-semibold text-lg truncate">{server.name}</h2>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </Button>
        </div>

        {/* Channel List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {/* Text Channels Category */}
          <Collapsible open={expandedCategories.has("text")}>
            <CollapsibleTrigger
              onClick={() => toggleCategory("text")}
              className="flex items-center justify-between w-full p-2 text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-300 transition-colors group"
            >
              <div className="flex items-center">
                {expandedCategories.has("text") ? (
                  <ChevronDown className="w-3 h-3 mr-1" />
                ) : (
                  <ChevronRight className="w-3 h-3 mr-1" />
                )}
                Metin Kanalları
              </div>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateChannelModal(true);
                }}
                className="w-6 h-6 p-1 opacity-100 text-white hover:text-gray-200 transition-colors cursor-pointer flex items-center justify-center rounded hover:bg-white/10"
              >
                <Plus className="w-4 h-4" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1">
              {textChannels.map((channel) => (
                <Button
                  key={channel.id || channel._id}
                  variant="ghost"
                  onClick={() => onChannelSelect(channel)}
                  className={`w-full justify-start px-3 py-2 text-left group transition-all duration-200 ${
                    (activeChannel._id || activeChannel.id) === (channel._id || channel.id)
                      ? "bg-white/10 text-white backdrop-blur-sm"
                      : "text-gray-300 hover:bg-white/5 hover:text-gray-100"
                  }`}
                >
                  <div className="flex items-center space-x-2 flex-1">
                    <Hash className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="truncate flex-1">{channel.name}</span>
                  </div>
                  {channel.hasNotification && (
                    <Badge variant="destructive" className="ml-auto text-xs px-1.5 py-0.5">
                      {channel.notificationCount}
                    </Badge>
                  )}
                </Button>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Voice Channels Category */}
          <Collapsible open={expandedCategories.has("voice")}>
            <CollapsibleTrigger
              onClick={() => toggleCategory("voice")}
              className="flex items-center justify-between w-full p-2 text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-300 transition-colors group"
            >
              <div className="flex items-center">
                {expandedCategories.has("voice") ? (
                  <ChevronDown className="w-3 h-3 mr-1" />
                ) : (
                  <ChevronRight className="w-3 h-3 mr-1" />
                )}
                Ses Kanalları
              </div>
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateChannelModal(true);
                }}
                className="w-6 h-6 p-1 opacity-100 text-white hover:text-gray-200 transition-colors cursor-pointer flex items-center justify-center rounded hover:bg-white/10">
                <Plus className="w-4 h-4" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent key="voice-channels" className="space-y-1">
              {voiceChannels.map((channel) => {
                const channelId = channel._id || channel.id;

                return (
                  <div key={channelId} className="space-y-1 relative group">
                      <Button
                        variant="ghost"
                        onClick={() => handleVoiceChannelSelect(channel)}
                        className={`w-full justify-start px-3 py-2 text-left transition-all duration-200 ${
                          (activeChannel?._id || activeChannel?.id) === channelId
                            ? "bg-white/10 text-white backdrop-blur-sm"
                            : "text-gray-300 hover:bg-white/5 hover:text-gray-100"
                        }`}
                      >
                        <div className="flex items-center space-x-2 flex-1">
                          <Volume2 className="w-4 h-4 mr-2 text-gray-400" />
                          {editingChannel && (editingChannel._id || editingChannel.id) === channelId ? (
                            <input
                              type="text"
                              value={editChannelName}
                              onChange={(e) => setEditChannelName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  saveChannelEdit();
                                } else if (e.key === 'Escape') {
                                  cancelChannelEdit();
                                }
                              }}
                              onBlur={saveChannelEdit}
                              className="bg-gray-700 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                              autoFocus
                              disabled={loading}
                            />
                          ) : (
                            <>
                              <span className="truncate flex-1">{channel.name}</span>
                            </>
                          )}
                        </div>
                      </Button>

                      {/* Dropdown menu for voice channels */}
                      {!(editingChannel && (editingChannel._id || editingChannel.id) === channelId) && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-gray-300 hover:bg-gray-700/30 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-gray-800 border-gray-600 text-white">
                              <DropdownMenuItem
                                onClick={() => handleEditChannel(channel)}
                                className="hover:bg-gray-700 hover:text-white focus:bg-gray-700 focus:text-white cursor-pointer"
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Düzenle
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteChannel(channel)}
                                className="hover:bg-red-700 focus:bg-red-700 text-red-400 focus:text-red-300 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Sil
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    <VoiceParticipantList 
                      channelId={channelId}
                      showMuteIcons={true}
                    />
                  </div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        </div>

      </div>

      {/* Server Settings Modal */}
      <ServerSettingsModal
        isOpen={isServerSettingsOpen}
        onClose={() => setIsServerSettingsOpen(false)}
        server={server}
        onServerUpdate={handleServerUpdate}
      />
      
      {/* Create Channel Modal */}
      <CreateChannelModal
        isOpen={showCreateChannelModal}
        onClose={() => setShowCreateChannelModal(false)}
        serverId={server?._id || server?.id}
        onChannelCreated={handleChannelCreated}
      />

      {/* Delete Channel Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-gray-900/98 border border-gray-600 shadow-2xl backdrop-blur-md text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-xl font-bold">Kanalı Sil</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              "{channelToDelete?.name}" kanalını silmek istediğinizden emin misiniz? 
              Bu işlem geri alınamaz ve kanal kalıcı olarak silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={loading}
              className="bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600 hover:border-gray-500 transition-colors"
            >
              İptal
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteChannel} 
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white shadow-lg"
            >
              {loading ? 'Siliniyor...' : 'Sil'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ChannelSidebar;