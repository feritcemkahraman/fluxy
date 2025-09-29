import React from 'react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
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
      <DialogContent className="max-w-sm bg-[#2b2d31] border border-gray-700/50 text-white p-0 overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Incoming Call from {callData.username}</DialogTitle>
        </VisuallyHidden>

        <div className="p-8 flex flex-col items-center">
          {/* Caller Avatar */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75" />
            {callData.avatar ? (
              <img 
                src={callData.avatar} 
                alt={callData.username}
                className="relative w-32 h-32 rounded-full object-cover ring-4 ring-green-500"
              />
            ) : (
              <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ring-4 ring-green-500">
                <span className="text-white text-5xl font-bold">
                  {callData.username?.charAt(0) || 'U'}
                </span>
              </div>
            )}
          </div>

          {/* Caller Info */}
          <h2 className="text-2xl font-bold text-white mb-2">
            {callData.username || 'Unknown User'}
          </h2>
          <p className="text-gray-400 mb-2">
            {isVideoCall ? 'Görüntülü arama yapıyor...' : 'Sesli arama yapıyor...'}
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
            {isVideoCall ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            <span>{isVideoCall ? 'Video Call' : 'Voice Call'}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4 w-full">
            {/* Reject Button */}
            <Button
              onClick={onReject}
              className="flex-1 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg"
            >
              <PhoneOff className="w-5 h-5 mr-2" />
              Reddet
            </Button>

            {/* Accept Button */}
            <Button
              onClick={onAccept}
              className="flex-1 h-12 rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold shadow-lg"
            >
              <Phone className="w-5 h-5 mr-2" />
              Kabul Et
            </Button>
          </div>
        </div>

        {/* Animated Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-blue-500 animate-pulse" />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncomingCallModal;
