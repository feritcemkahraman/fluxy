import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from './ui/button';
import { Phone, PhoneOff, Video } from 'lucide-react';

/**
 * Incoming Call Modal - Discord Style
 * Shows when receiving a voice/video call
 * 
 * @param {boolean} isOpen - Modal visibility state
 * @param {Object} callData - Call information (userId, username, avatar, callType)
 * @param {Function} onAccept - Callback when call is accepted
 * @param {Function} onReject - Callback when call is rejected
 */
const IncomingCallModal = ({ 
  isOpen, 
  callData, 
  onAccept, 
  onReject 
}) => {
  if (!callData) return null;

  const isVideoCall = callData.callType === 'video';

  return (
    <Dialog open={isOpen} onOpenChange={onReject}>
      <DialogContent className="max-w-md bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-green-500/30 text-white p-0 overflow-hidden shadow-2xl">
        <VisuallyHidden>
          <DialogTitle>Incoming Call from {callData.displayName || callData.username}</DialogTitle>
          <DialogDescription>
            {isVideoCall ? 'Video' : 'Voice'} call from {callData.displayName || callData.username}
          </DialogDescription>
        </VisuallyHidden>

        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-blue-500/5 to-purple-500/5 animate-pulse pointer-events-none" />
        
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 animate-pulse" />

        <div className="relative p-10 flex flex-col items-center">
          {/* Caller Avatar with multiple rings */}
          <div className="relative mb-8">
            {/* Outer pulse ring */}
            <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20 scale-110" />
            <div className="absolute inset-0 bg-green-500 rounded-full animate-pulse opacity-30 scale-105" />
            
            {/* Avatar */}
            <div className="relative w-36 h-36 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center ring-4 ring-green-500 shadow-2xl shadow-green-500/50 animate-pulse">
              <span className="text-white text-6xl font-bold drop-shadow-lg">
                {(callData.displayName || callData.username)?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            
            {/* Call type badge */}
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-green-600 rounded-full px-4 py-1.5 shadow-lg border-2 border-gray-900">
              <div className="flex items-center gap-1.5">
                {isVideoCall ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                <span className="text-xs font-semibold">{isVideoCall ? 'Video' : 'Voice'}</span>
              </div>
            </div>
          </div>

          {/* Caller Info */}
          <h2 className="text-3xl font-bold text-white mb-2 text-center drop-shadow-lg">
            {callData.displayName || callData.username || 'Unknown User'}
          </h2>
          <p className="text-gray-300 text-lg mb-8 animate-pulse">
            {isVideoCall ? 'Görüntülü arama yapıyor...' : 'Sesli arama yapıyor...'}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-4 w-full">
            {/* Reject Button */}
            <Button
              onClick={onReject}
              className="flex-1 h-14 rounded-full bg-red-600 hover:bg-red-700 hover:scale-105 text-white font-bold shadow-xl shadow-red-600/50 transition-all duration-200 border-2 border-red-500/50"
            >
              <PhoneOff className="w-5 h-5 mr-2" />
              Reddet
            </Button>

            {/* Accept Button */}
            <Button
              onClick={onAccept}
              className="flex-1 h-14 rounded-full bg-green-600 hover:bg-green-700 hover:scale-105 text-white font-bold shadow-xl shadow-green-600/50 transition-all duration-200 border-2 border-green-500/50"
            >
              <Phone className="w-5 h-5 mr-2" />
              Kabul Et
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncomingCallModal;
