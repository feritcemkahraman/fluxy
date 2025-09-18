import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { X } from "lucide-react";

const GlassmorphismModal = ({ 
  isOpen, 
  onClose, 
  title, 
  description,
  children, 
  showCloseButton = true,
  size = "default" 
}) => {
  const sizeClasses = {
    small: "max-w-md",
    default: "max-w-lg",
    large: "max-w-2xl",
    xlarge: "max-w-4xl"
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={`${sizeClasses[size]} bg-black/80 backdrop-blur-xl border border-white/20 text-white shadow-2xl`}
      >
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-white/10">
          <div className="flex-1">
            <DialogTitle className="text-xl font-semibold text-white">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-gray-400 text-sm mt-1">
                {description}
              </DialogDescription>
            )}
          </div>
          {showCloseButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="w-8 h-8 text-gray-400 hover:text-white hover:bg-white/10 ml-4"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </DialogHeader>
        
        <div className="pt-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GlassmorphismModal;