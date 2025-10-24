import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Copy, Check, Users, Calendar, Hash, CheckCircle } from 'lucide-react';
import { serverAPI } from '../services/api';
import { toast } from 'sonner';

const ServerInviteModal = ({ isOpen, onClose, server }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const serverId = server?._id || server?.id;
  const inviteLink = inviteCode ? `${window.location.origin}/invite/${inviteCode}` : '';

  useEffect(() => {
    if (isOpen && server) {
      loadInviteCode();
    }
  }, [isOpen, server]);

  const loadInviteCode = async () => {
    if (server?.inviteCode) {
      setInviteCode(server.inviteCode);
      return;
    }

    try {
      setLoading(true);
      const response = await serverAPI.createInvite(serverId);
      setInviteCode(response.inviteCode);
    } catch (error) {
      console.error('Failed to load invite code:', error);
      toast.error('Davet kodu yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      // Check if Electron API is available (desktop app)
      if (window.electronAPI?.clipboard) {
        await window.electronAPI.clipboard.writeText(inviteCode);
        setCopied(true);
        toast.success('Davet kodu kopyalandı!');
        setTimeout(() => setCopied(false), 2000);
        return;
      }
      
      // Check if clipboard API is available and secure context
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(inviteCode);
        setCopied(true);
        toast.success('Davet kodu kopyalandı!');
        setTimeout(() => setCopied(false), 2000);
        return;
      }
      
      // Fallback for non-secure contexts or unsupported browsers
      throw new Error('Clipboard API not available');
      
    } catch (error) {
      console.error('Copy failed:', error);
      
      try {
        // Fallback: Create a temporary input element
        const tempInput = document.createElement('input');
        tempInput.value = inviteCode;
        tempInput.style.position = 'absolute';
        tempInput.style.left = '-9999px';
        document.body.appendChild(tempInput);
        tempInput.select();
        tempInput.setSelectionRange(0, 99999); // For mobile devices
        
        const successful = document.execCommand('copy');
        document.body.removeChild(tempInput);
        
        if (successful) {
          setCopied(true);
          toast.success('Davet kodu kopyalandı!');
          setTimeout(() => setCopied(false), 2000);
        } else {
          throw new Error('execCommand failed');
        }
      } catch (fallbackError) {
        console.error('Fallback copy failed:', fallbackError);
        toast.error('Kopyalama başarısız oldu. Kodu manuel olarak seçip kopyalayın.');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" />
            Arkadaşlarını Davet Et
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {server?.name} sunucusuna arkadaşlarını davet et
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Server Info */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                {server?.name?.charAt(0) || 'S'}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white">{server?.name}</h3>
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {server?.memberCount || 0} üye
                  </span>
                  <span className="flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    {server?.channels?.length || 0} kanal
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Invite Code */}
          {loading ? (
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10 animate-pulse">
              <div className="h-20 bg-white/10 rounded"></div>
            </div>
          ) : inviteCode ? (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-300">Davet Kodu</label>
              <div className="bg-blue-500/10 backdrop-blur-sm rounded-lg p-6 border border-blue-500/20">
                <div className="flex flex-col items-center gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-2">Sunucu Davet Kodu</p>
                    <p className="text-4xl font-bold text-blue-400 font-mono tracking-widest">
                      {inviteCode}
                    </p>
                  </div>
                  <Button
                    onClick={handleCopy}
                    size="lg"
                    className={`w-full transition-all duration-300 ${
                      copied
                        ? 'bg-green-600 hover:bg-green-700 text-white border-green-500/50'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2 animate-in zoom-in duration-200" />
                        Kopyalandı!
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5 mr-2" />
                        Kodu Kopyala
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Bu kod kalıcıdır ve herkes tarafından kullanılabilir
              </p>
            </div>
          ) : null}

          {/* Info */}
          <div className="bg-yellow-500/10 backdrop-blur-sm rounded-lg p-3 border border-yellow-500/20">
            <p className="text-xs text-yellow-200/80">
              💡 Bu davet kodu kalıcıdır. Arkadaşlarınız bu kodu kullanarak sunucuya katılabilir.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="ghost"
            onClick={onClose}
            className="hover:bg-white/10"
          >
            Kapat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ServerInviteModal;
