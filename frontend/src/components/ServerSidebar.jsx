import React, { useState } from "react";
import { Button } from "./ui/button";
import { Plus, Home } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import CreateServerModal from "./CreateServerModal";

const ServerSidebar = ({ servers, activeServerId, onServerSelect, isDirectMessages, onServerCreated }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  return (
    <div className="w-24 flex flex-col items-center py-4 px-3 space-y-2">
      {/* Home Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onServerSelect("home")}
              className={`w-12 h-12 transition-all duration-300 group relative ${
                isDirectMessages
                  ? "rounded-xl bg-white/20 backdrop-blur-md border border-white/30"
                  : "rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 hover:rounded-xl"
              }`}
            >
              <Home className="w-6 h-6 text-white group-hover:text-blue-300 transition-colors" />
              
              {/* Active indicator */}
              {isDirectMessages && (
                <div className="absolute -left-4 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Direct Messages</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Separator */}
      <div className="w-8 h-0.5 bg-white/20 rounded-full" />

      {/* Server List */}
      <div className="flex flex-col space-y-2">
        {servers?.filter(server => server && (server.id || server._id)).map((server) => (
          <TooltipProvider key={server.id || server._id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onServerSelect(server)}
                  className={`w-12 h-12 transition-all duration-300 group relative ${
                    (activeServerId && server.id && activeServerId === server.id) || 
                    (activeServerId && server._id && activeServerId === server._id)
                      ? "rounded-xl bg-white/20 backdrop-blur-md border border-white/30"
                      : "rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 hover:rounded-xl"
                  }`}
                >
                  <Avatar className="w-full h-full">
                    <AvatarImage src={server?.icon} alt={server?.name || 'Server'} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white font-bold">
                      {server?.name?.charAt(0) || 'S'}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Active indicator */}
                  {((activeServerId && server.id && activeServerId === server.id) || 
                    (activeServerId && server._id && activeServerId === server._id)) && (
                    <div className="absolute -left-4 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                  )}
                  
                  {/* Notification indicator */}
                  {server.hasNotification && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-medium">{server.notificationCount}</span>
                    </div>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{server?.name || 'Unnamed Server'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
        
        {/* Add Server Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCreateModal(true)}
                className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-green-500/20 hover:rounded-xl transition-all duration-300 group"
              >
                <Plus className="w-6 h-6 text-green-400 group-hover:text-green-300 transition-colors" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add a Server</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Create Server Modal */}
      <CreateServerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onServerCreated={(newServer) => {
          onServerCreated?.(newServer);
          setShowCreateModal(false);
        }}
      />
    </div>
  );
};

export default ServerSidebar;