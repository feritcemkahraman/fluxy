import React, { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { 
  Upload, 
  File, 
  Image, 
  Music, 
  Video, 
  X,
  Download,
  Eye
} from "lucide-react";
import { Badge } from "./ui/badge";

const FileUploadArea = ({ onFileUpload, onClose }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const fileInputRef = useRef(null);

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return Image;
    if (fileType.startsWith('video/')) return Video;
    if (fileType.startsWith('audio/')) return Music;
    return File;
  };

  const getFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    files.forEach(file => {
      const fileId = `${Date.now()}-${Math.random()}`;
      const fileObj = {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type,
        file: file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      };

      setUploadedFiles(prev => [...prev, fileObj]);
      
      // Simulate upload progress
      simulateUpload(fileId);
    });
  };

  const simulateUpload = (fileId) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }
      setUploadProgress(prev => ({ ...prev, [fileId]: progress }));
    }, 200);
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
  };

  const handleSendFiles = () => {
    if (uploadedFiles.length > 0) {
      onFileUpload(uploadedFiles);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-black/90 backdrop-blur-xl border border-white/20 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Upload Files</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 ${
            isDragOver 
              ? "border-blue-500 bg-blue-500/10" 
              : "border-white/30 bg-white/5 hover:border-white/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-white font-medium mb-2">
            Drag and drop files here, or click to browse
          </p>
          <p className="text-gray-400 text-sm mb-4">
            You can upload images, videos, audio files, and documents
          </p>
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Choose Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
          />
        </div>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div className="mt-6 max-h-64 overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">
              Uploaded Files ({uploadedFiles.length})
            </h3>
            <div className="space-y-3">
              {uploadedFiles.map((file) => {
                const IconComponent = getFileIcon(file.type);
                const progress = uploadProgress[file.id] || 0;
                
                return (
                  <div key={file.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-start space-x-3">
                      {file.preview ? (
                        <img 
                          src={file.preview} 
                          alt={file.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-white/10 rounded flex items-center justify-center">
                          <IconComponent className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium truncate">
                            {file.name}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile(file.id)}
                            className="w-6 h-6 text-gray-400 hover:text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center space-x-3 mt-1">
                          <Badge variant="secondary" className="bg-white/10 text-gray-300 text-xs">
                            {getFileSize(file.size)}
                          </Badge>
                          <Badge variant="secondary" className="bg-white/10 text-gray-300 text-xs">
                            {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                          </Badge>
                        </div>
                        
                        {progress < 100 && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                              <span>Uploading...</span>
                              <span>{Math.round(progress)}%</span>
                            </div>
                            <Progress value={progress} className="h-1" />
                          </div>
                        )}
                        
                        {progress === 100 && (
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge variant="outline" className="text-green-400 border-green-400 text-xs">
                              Upload Complete
                            </Badge>
                            {file.preview && (
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                <Eye className="w-3 h-3 mr-1" />
                                Preview
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
          <p className="text-gray-400 text-sm">
            {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} ready to send
          </p>
          <div className="flex space-x-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendFiles}
              disabled={uploadedFiles.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Send Files
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploadArea;