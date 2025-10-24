import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { X, Hash, Volume2 } from 'lucide-react';
import { channelAPI } from '../services/api';
import { toast } from 'sonner';

const CreateChannelModal = ({ isOpen, onClose, serverId, onChannelCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'text',
    isPrivate: false
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Kanal adı gereklidir');
      return;
    }

    if (!serverId) {
      toast.error('Sunucu ID gereklidir');
      return;
    }

    setIsLoading(true);

    try {
      const response = await channelAPI.createChannel({
        name: formData.name.trim(),
        description: formData.description.trim(),
        type: formData.type,
        serverId: serverId,
        isPrivate: formData.isPrivate
      });

      toast.success('Kanal başarıyla oluşturuldu!');
      onChannelCreated(response.channel);
      handleClose();
    } catch (error) {
      console.error('Failed to create channel:', error);
      toast.error(error.response?.data?.message || 'Kanal oluşturma başarısız');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', description: '', type: 'text', isPrivate: false });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Kanal Oluştur</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Channel Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Kanal Türü
            </label>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="text"
                  checked={formData.type === 'text'}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                />
                <div className="flex items-center space-x-3">
                  <Hash className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-white font-medium">Metin</p>
                    <p className="text-sm text-gray-400">Mesaj, resim, GIF, emoji, görüş ve espri gönderin</p>
                  </div>
                </div>
              </label>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="voice"
                  checked={formData.type === 'voice'}
                  onChange={handleChange}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                />
                <div className="flex items-center space-x-3">
                  <Volume2 className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-white font-medium">Ses</p>
                    <p className="text-sm text-gray-400">Ses, video ve ekran paylaşımı ile birlikte takılın</p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Channel Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Kanal Adı <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                {formData.type === 'text' ? (
                  <Hash className="w-4 h-4 text-gray-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="yeni-kanal"
                className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                maxLength={50}
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formData.name.length}/50 karakter
            </p>
          </div>

          {/* Channel Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Açıklama
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Bu kanal ne hakkında?"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.description.length}/200 karakter
            </p>
          </div>

          {/* Private Channel */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="isPrivate"
              name="isPrivate"
              checked={formData.isPrivate}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="isPrivate" className="text-sm text-gray-300">
              🔒 Özel Kanal
            </label>
          </div>
          <p className="text-xs text-gray-500">
            Sadece seçilen üyeler ve roller bu kanalı görüntüleyebilir
          </p>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              disabled={isLoading}
            >
              İptal
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isLoading || !formData.name.trim()}
            >
              {isLoading ? 'Oluşturuluyor...' : 'Kanal Oluştur'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChannelModal;
