import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { 
  Copy, 
  Edit, 
  Trash2, 
  Reply, 
  Pin, 
  Flag, 
  UserPlus,
  MessageSquare,
  Phone,
  Ban,
  Shield,
  Crown
} from "lucide-react";

const ContextMenu = ({ x, y, onClose, type, data }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleClickOutside = (event) => {
      setIsVisible(false);
      setTimeout(onClose, 150);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsVisible(false);
        setTimeout(onClose, 150);
      }
    };

    document.addEventListener("click", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const handleAction = (action) => {
    console.log(`${action} action triggered for ${type}:`, data);
    setIsVisible(false);
    setTimeout(onClose, 150);
  };

  const getMenuItems = () => {
    switch (type) {
      case "message":
        return [
          { icon: Reply, label: "Reply", action: "reply" },
          { icon: Copy, label: "Copy Message", action: "copy" },
          { icon: Edit, label: "Edit Message", action: "edit", disabled: data?.author?.id !== "user1" },
          { icon: Pin, label: "Pin Message", action: "pin" },
          { icon: Flag, label: "Report Message", action: "report" },
          { divider: true },
          { icon: Trash2, label: "Delete Message", action: "delete", danger: true, disabled: data?.author?.id !== "user1" }
        ];

      case "user":
        return [
          { icon: MessageSquare, label: "Send Message", action: "message" },
          { icon: Phone, label: "Call", action: "call" },
          { icon: UserPlus, label: "Add Friend", action: "friend" },
          { divider: true },
          { icon: Shield, label: "Kick from Server", action: "kick", danger: true },
          { icon: Ban, label: "Ban from Server", action: "ban", danger: true },
          { icon: Crown, label: "Make Moderator", action: "promote" }
        ];

      case "channel":
        return [
          { icon: Edit, label: "Edit Channel", action: "edit" },
          { icon: Copy, label: "Copy Channel ID", action: "copy" },
          { divider: true },
          { icon: Trash2, label: "Delete Channel", action: "delete", danger: true }
        ];

      case "server":
        return [
          { icon: UserPlus, label: "Invite People", action: "invite" },
          { icon: Copy, label: "Copy Server ID", action: "copy" },
          { divider: true },
          { icon: Edit, label: "Server Settings", action: "settings" }
        ];

      default:
        return [];
    }
  };

  const menuItems = getMenuItems().filter(item => !item.disabled);

  return (
    <div
      className={`fixed z-50 min-w-48 bg-black/90 backdrop-blur-xl border border-white/20 rounded-lg shadow-2xl transition-all duration-150 ${
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
      style={{ 
        left: `${x}px`, 
        top: `${y}px`,
        transform: `translate(${x > window.innerWidth - 200 ? '-100%' : '0'}, ${y > window.innerHeight - 300 ? '-100%' : '0'})`
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="py-2">
        {menuItems.map((item, index) => (
          item.divider ? (
            <div key={index} className="my-1 h-px bg-white/10" />
          ) : (
            <Button
              key={index}
              variant="ghost"
              onClick={() => handleAction(item.action)}
              className={`w-full justify-start px-3 py-2 text-sm transition-colors ${
                item.danger 
                  ? "text-red-400 hover:text-red-300 hover:bg-red-500/10" 
                  : "text-gray-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <item.icon className="w-4 h-4 mr-3" />
              {item.label}
            </Button>
          )
        ))}
      </div>
    </div>
  );
};

export default ContextMenu;