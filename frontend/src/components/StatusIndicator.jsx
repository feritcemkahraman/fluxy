import React from "react";

const StatusIndicator = ({ status, size = "small" }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "idle": return "bg-yellow-500";
      case "dnd": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const sizeClasses = {
    small: "w-3 h-3",
    medium: "w-4 h-4",
    large: "w-5 h-5"
  };

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full ${getStatusColor(status)} border-2 border-black/50 shadow-lg`}
      title={status.charAt(0).toUpperCase() + status.slice(1)}
    >
      {status === "idle" && (
        <div className="w-full h-full rounded-full bg-yellow-500 animate-pulse" />
      )}
    </div>
  );
};

export default StatusIndicator;