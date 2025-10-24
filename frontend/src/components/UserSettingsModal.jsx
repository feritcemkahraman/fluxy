import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Slider } from "./ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { 
  X, 
  Settings, 
  Users, 
  Shield, 
  Hash, 
  Volume2, 
  Crown,
  Edit,
  Trash2,
  Plus,
  User,
  Palette,
  Bell,
  Mic,
  MicOff,
  Headphones,
  VolumeX,
  Volume1,
  Volume2 as VolumeHigh,
  Camera,
  Monitor,
  TestTube,
  Play,
  Square,
  RotateCcw
} from "lucide-react";
import { userSettingsAPI } from '../services/api';
import { profileAPI } from '../services/api';

const UserSettingsModal = ({ isOpen, onClose, user, onUserUpdate }) => {
  const [userProfile, setUserProfile] = useState({
    username: user.username,
    displayName: user.displayName || user.username,
    discriminator: user.discriminator,
    avatar: null, // Always use initial letters instead of avatar URL
    status: user.status
  });

  const [settings, setSettings] = useState({
    theme: "dark",
    glassmorphism: true,
    notifications: {
      desktop: true,
      soundEffects: true,
      messageNotifications: true,
      callNotifications: true,
      friendRequestNotifications: true
    },
    voice: {
      inputVolume: 80,
      outputVolume: 75,
      inputSensitivity: 60,
      pushToTalk: false,
      pushToTalkKey: 'Space',
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true,
      inputDevice: 'default',
      outputDevice: 'default'
    },
    privacy: {
      allowDirectMessages: true,
      enableFriendRequests: true,
      showOnlineStatus: true,
      allowServerInvites: true,
      dataCollection: false
    },
    chat: {
      fontSize: 14,
      messageDisplayMode: 'cozy',
      showTimestamps: true,
      use24HourTime: false,
      enableEmojis: true,
      enableAnimatedEmojis: true,
      enableSpoilerTags: true
    }
  });

  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [audioDevices, setAudioDevices] = useState({
    inputDevices: [],
    outputDevices: [],
    selectedInput: 'default',
    selectedOutput: 'default'
  });
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [isTestingSpeaker, setIsTestingSpeaker] = useState(false);
  const [isListeningForKey, setIsListeningForKey] = useState(false);
  const mediaRecorderRef = useRef(null);
  const testAudioRef = useRef(null);

  const statusOptions = [
    { value: "online", label: "Çevrimiçi", color: "bg-green-500" },
    { value: "idle", label: "Uzakta", color: "bg-yellow-500" },
    { value: "dnd", label: "Rahatsız Etmeyin", color: "bg-red-500" },
    { value: "invisible", label: "Görünmez", color: "bg-gray-500" }
  ];

  // Tuş kodunu kullanıcı dostu ada çevir
  const formatKeyName = (keyCode) => {
    const keyMappings = {
      'Space': 'Space',
      'ControlLeft': 'Sol Ctrl',
      'ControlRight': 'Sağ Ctrl',
      'AltLeft': 'Sol Alt',
      'AltRight': 'Sağ Alt',
      'ShiftLeft': 'Sol Shift',
      'ShiftRight': 'Sağ Shift',
      'KeyA': 'A', 'KeyB': 'B', 'KeyC': 'C', 'KeyD': 'D', 'KeyE': 'E',
      'KeyF': 'F', 'KeyG': 'G', 'KeyH': 'H', 'KeyI': 'I', 'KeyJ': 'J',
      'KeyK': 'K', 'KeyL': 'L', 'KeyM': 'M', 'KeyN': 'N', 'KeyO': 'O',
      'KeyP': 'P', 'KeyQ': 'Q', 'KeyR': 'R', 'KeyS': 'S', 'KeyT': 'T',
      'KeyU': 'U', 'KeyV': 'V', 'KeyW': 'W', 'KeyX': 'X', 'KeyY': 'Y',
      'KeyZ': 'Z'
    };
    return keyMappings[keyCode] || keyCode.replace('Key', '');
  };

  // Cihazları al
  useEffect(() => {
    const getAudioDevices = async () => {
      try {
        // Kullanıcı izni iste
        await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputDevices = devices.filter(device => device.kind === 'audioinput');
        const outputDevices = devices.filter(device => device.kind === 'audiooutput');
        
        setAudioDevices({
          inputDevices,
          outputDevices,
          selectedInput: inputDevices.length > 0 ? inputDevices[0].deviceId : 'default',
          selectedOutput: outputDevices.length > 0 ? outputDevices[0].deviceId : 'default'
        });
      } catch (error) {
        // İzin verilmediyse veya hata oluştuysa default değerler kullan
        setAudioDevices({
          inputDevices: [],
          outputDevices: [],
          selectedInput: 'default',
          selectedOutput: 'default'
        });
      }
    };

    if (isOpen) {
      getAudioDevices();
      
      // Cihaz değişikliklerini dinle
      const handleDeviceChange = () => {
        getAudioDevices();
      };
      
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      };
    }
  }, [isOpen]);

  // Mikrofon test fonksiyonu
  const testMicrophone = async () => {
    try {
      setIsTestingMic(true);
      const constraints = {
        audio: audioDevices.selectedInput && audioDevices.selectedInput !== 'default' 
          ? { deviceId: { exact: audioDevices.selectedInput } }
          : true
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.volume = 0.5; // Ses seviyesini düşür
        audio.play().catch(() => {}); // Silence any audio errors
        
        // Temizlik
        setTimeout(() => {
          URL.revokeObjectURL(audioUrl);
        }, 1000);
      };
      
      mediaRecorder.start();
      
      setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
        stream.getTracks().forEach(track => track.stop());
        setIsTestingMic(false);
      }, 2000);
    } catch (error) {
      setIsTestingMic(false);
      console.error('Mikrofon testi başarısız.', error);
    }
  };

  // Hoparlör test fonksiyonu
  const testSpeaker = async () => {
    try {
      setIsTestingSpeaker(true);
      
      // Audio context oluştur
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Farklı frekanslarda test tonları çal
      const frequencies = [440, 880, 660]; // A4, A5, E5
      let currentIndex = 0;
      
      const playTone = (frequency) => {
        if (currentIndex >= frequencies.length) {
          setIsTestingSpeaker(false);
          audioContext.close();
          return;
        }
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
        
        setTimeout(() => {
          currentIndex++;
          playTone(frequencies[currentIndex]);
        }, 400);
      };
      
      playTone(frequencies[0]);
      
    } catch (error) {
      setIsTestingSpeaker(false);
      // Alert notification removed as requested
    }
  };

  const themeOptions = [
    { value: "dark", label: "Koyu Glassmorphism", preview: "bg-gradient-to-br from-gray-900 to-slate-800" },
    { value: "light", label: "Açık Glassmorphism", preview: "bg-gradient-to-br from-gray-100 to-white" },
    { value: "purple", label: "Mor Glassmorphism", preview: "bg-gradient-to-br from-purple-900 to-indigo-800" },
    { value: "blue", label: "Mavi Glassmorphism", preview: "bg-gradient-to-br from-blue-900 to-cyan-800" }
  ];

  // Update userProfile when user prop changes or modal opens
  useEffect(() => {
    if (user && isOpen) {
      setUserProfile({
        username: user.username,
        displayName: user.displayName || user.username,
        discriminator: user.discriminator,
        avatar: null, // Always use initial letters instead of avatar URL
        status: user.status
      });
      
      // Load user settings from backend
      loadUserSettings();
      
      setHasChanges(false); // Reset changes flag when modal opens
    }
  }, [user, isOpen]);

  const loadUserSettings = async () => {
    try {
      setLoading(true);
      const response = await userSettingsAPI.getSettings();
      if (response) {
        setSettings(response);
      }
    } catch (error) {
      // Keep default settings if loading fails
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Save user profile
      const profileResponse = await profileAPI.updateProfile({
        username: userProfile.username,
        displayName: userProfile.displayName
      });
      
      // Save user settings
      await userSettingsAPI.updateSettings(settings);
      
      onUserUpdate({ 
        ...user, 
        username: userProfile.username,
        displayName: userProfile.displayName
      });
      
      // Settings saved successfully
    } catch (error) {
      throw error; // Re-throw to prevent setHasChanges(false) in finally
    } finally {
      setLoading(false);
    }
    
    // Only set hasChanges to false if save was successful
    setHasChanges(false);
    onClose();
  };

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const handleDirectSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[80vh] bg-black/90 backdrop-blur-xl border border-white/20 text-white p-0">
        <div className="flex h-full">
          <Tabs defaultValue="profile" orientation="vertical" className="flex w-full">
            {/* Sidebar */}
            <div className="w-80 bg-black/50 backdrop-blur-md border-r border-white/10 p-4">
              <DialogHeader className="mb-6">
                <DialogTitle className="text-xl font-bold text-white">
                  Kullanıcı Ayarları
                </DialogTitle>
                <DialogDescription className="text-gray-400 text-sm">
                  Profil bilgilerinizi ve uygulama ayarlarınızı yönetin
                </DialogDescription>
              </DialogHeader>
              
              <TabsList className="flex flex-col h-auto space-y-3 bg-transparent">
                <TabsTrigger 
                  value="profile" 
                  className="w-full justify-start text-left text-lg data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400 hover:text-white hover:bg-white/5"
                >
                  <User className="w-5 h-5 mr-3" />
                  Profil
                </TabsTrigger>
                <TabsTrigger 
                  value="appearance" 
                  className="w-full justify-start text-left text-lg data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400 hover:text-white hover:bg-white/5"
                >
                  <Palette className="w-5 h-5 mr-3" />
                  Görünüm
                </TabsTrigger>
                <TabsTrigger 
                  value="voice" 
                  className="w-full justify-start text-left text-lg data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400 hover:text-white hover:bg-white/5"
                >
                  <Volume2 className="w-5 h-5 mr-3" />
                  Ses ve Video
                </TabsTrigger>
                <TabsTrigger 
                  value="notifications" 
                  className="w-full justify-start text-left text-lg data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400 hover:text-white hover:bg-white/5"
                >
                  <Bell className="w-5 h-5 mr-3" />
                  Bildirimler
                </TabsTrigger>
                <TabsTrigger 
                  value="privacy" 
                  className="w-full justify-start text-left text-lg data-[state=active]:bg-white/10 data-[state=active]:text-white text-gray-400 hover:text-white hover:bg-white/5"
                >
                  <Shield className="w-5 h-5 mr-3" />
                  Gizlilik ve Güvenlik
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Main Content */}
            <div className="flex-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
              {/* Profile Tab */}
              <TabsContent value="profile" className="p-6 space-y-6 overflow-y-auto max-h-[calc(80vh-8rem)]">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Hesabım</h2>
                  <p className="text-gray-400">Profil bilgilerinizi ve durumunuzu yönetin.</p>
                </div>
                {/* Profile Card */}
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="relative group">
                      <Avatar className="w-20 h-20 ring-4 ring-white/20">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl">
                          {userProfile?.username?.charAt(0)?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute inset-0 w-full h-full rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Camera className="w-6 h-6 text-white" />
                      </Button>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white">
                        {user.displayName || user.username}
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="username" className="text-gray-300">Kullanıcı Adı</Label>
                      <Input
                        id="username"
                        value={userProfile?.username || ''}
                        onChange={(e) => {
                          setUserProfile(prev => ({ ...prev, username: e.target.value }));
                          setHasChanges(true);
                        }}
                        className="mt-1 bg-black/30 border-white/20 text-white"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="displayName" className="text-gray-300">Görünen Ad</Label>
                      <Input
                        id="displayName"
                        value={userProfile?.displayName || ''}
                        onChange={(e) => {
                          setUserProfile(prev => ({ ...prev, displayName: e.target.value }));
                          setHasChanges(true);
                        }}
                        placeholder="Üyelerin göreceği adınız"
                        className="mt-1 bg-black/30 border-white/20 text-white"
                      />
                      <p className="text-xs text-gray-400 mt-1">Bu ad üye listesinde görünecek</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Label htmlFor="status" className="text-gray-300">Durum</Label>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      {statusOptions.map((status) => (
                        <Button
                          key={status.value}
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setUserProfile(prev => ({ ...prev, status: status.value }));
                            setHasChanges(true);
                          }}
                          className={`justify-start ${
                            userProfile.status === status.value 
                              ? "bg-white/10 text-white" 
                              : "text-gray-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full mr-2 ${status.color}`} />
                          {status.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                </div>
              </TabsContent>
              <TabsContent value="appearance" className="p-6 space-y-6 overflow-y-auto max-h-[calc(80vh-8rem)]">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Görünüm</h2>
                  <p className="text-gray-400">Fluxy deneyiminizi temalar ve glassmorphism efektleriyle özelleştirin.</p>
                </div>

                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                  <h3 className="text-lg font-semibold mb-4">Tema</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {themeOptions.map((theme) => (
                      <div
                        key={theme.value}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          settings.theme === theme.value
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-white/20 bg-white/5 hover:border-white/30"
                        }`}
                        onClick={() => handleDirectSettingChange('theme', theme.value)}
                      >
                        <div className={`w-full h-16 rounded-lg mb-3 ${theme.preview}`} />
                        <span className="text-white font-medium">{theme.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Gelişmiş Glassmorphism</h3>
                      <p className="text-gray-400 text-sm">Gelişmiş buzlu cam efektlerini etkinleştir</p>
                    </div>
                    <Switch
                      checked={settings.glassmorphism}
                      onCheckedChange={(checked) => handleDirectSettingChange('glassmorphism', checked)}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Voice & Video Tab */}
              <TabsContent value="voice" className="p-6 space-y-6 overflow-y-auto max-h-[calc(80vh-8rem)]">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Ses ve Video</h2>
                  <p className="text-gray-400">Ses ve video ayarlarınızı yapılandırın ve cihazlarınızı test edin.</p>
                </div>

                {/* Input Device Selection */}
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Mic className="w-5 h-5 mr-2 text-blue-400" />
                    Giriş Cihazı (Mikrofon)
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-300">Mikrofon Seçin</Label>
                      <Select 
                        value={audioDevices.selectedInput || 'default'} 
                        onValueChange={(value) => setAudioDevices(prev => ({ ...prev, selectedInput: value }))}
                      >
                        <SelectTrigger className="mt-1 bg-black/30 border-white/20 text-white">
                          <SelectValue placeholder="Mikrofon seçin..." />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 border-white/20 text-white">
                          {audioDevices.inputDevices.length > 0 ? (
                            audioDevices.inputDevices.map((device) => (
                              <SelectItem 
                                key={device.deviceId} 
                                value={device.deviceId || `mic-${device.deviceId}`}
                                className="focus:bg-white/10 focus:text-white"
                              >
                                🎤 {device.label || `Mikrofon ${device.deviceId?.slice(0, 8) || 'Unknown'}`}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="default" disabled className="focus:bg-white/10 focus:text-white">
                              ❌ Mikrofon bulunamadı
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-gray-300">Mikrofon Hassasiyeti</Label>
                      <div className="flex items-center space-x-4 mt-2">
                        <MicOff className="w-4 h-4 text-gray-400" />
                        <Slider
                          value={[settings.voice?.inputSensitivity || 60]}
                          onValueChange={(value) => handleSettingChange('voice', 'inputSensitivity', value[0])}
                          max={100}
                          step={1}
                          className="flex-1"
                        />
                        <Mic className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-300 w-8">{settings.voice?.inputSensitivity || 60}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-white font-medium">Mikrofon Testi</span>
                        <p className="text-gray-400 text-sm">Ses seviyenizi test edin</p>
                      </div>
                      <Button 
                        onClick={testMicrophone}
                        disabled={isTestingMic}
                        variant="outline"
                        size="sm"
                        className="bg-blue-600/20 border-blue-500/50 hover:bg-blue-600/30"
                      >
                        {isTestingMic ? (
                          <>
                            <Square className="w-4 h-4 mr-2" />
                            Test Ediliyor...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Test Et
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Output Device Selection */}
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Headphones className="w-5 h-5 mr-2 text-green-400" />
                    Çıkış Cihazı (Hoparlör/Kulaklık)
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-300">Hoparlör Seçin</Label>
                      <Select 
                        value={audioDevices.selectedOutput || 'default'} 
                        onValueChange={(value) => setAudioDevices(prev => ({ ...prev, selectedOutput: value }))}
                      >
                        <SelectTrigger className="mt-1 bg-black/30 border-white/20 text-white">
                          <SelectValue placeholder="Hoparlör seçin..." />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 border-white/20 text-white">
                          {audioDevices.outputDevices.length > 0 ? (
                            audioDevices.outputDevices.map((device) => (
                              <SelectItem 
                                key={device.deviceId} 
                                value={device.deviceId || `speaker-${device.deviceId}`}
                                className="focus:bg-white/10 focus:text-white"
                              >
                                🔊 {device.label || `Hoparlör ${device.deviceId?.slice(0, 8) || 'Unknown'}`}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="default" disabled className="focus:bg-white/10 focus:text-white">
                              ❌ Hoparlör bulunamadı
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-gray-300">Hoparlör Ses Seviyesi</Label>
                      <div className="flex items-center space-x-4 mt-2">
                        <VolumeX className="w-4 h-4 text-gray-400" />
                        <Slider
                          value={[settings.voice?.outputVolume || 75]}
                          onValueChange={(value) => handleSettingChange('voice', 'outputVolume', value[0])}
                          max={100}
                          step={1}
                          className="flex-1"
                        />
                        <VolumeHigh className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-300 w-8">{settings.voice?.outputVolume || 75}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-white font-medium">Hoparlör Testi</span>
                        <p className="text-gray-400 text-sm">Ses çıkışını test edin</p>
                      </div>
                      <Button 
                        onClick={testSpeaker}
                        disabled={isTestingSpeaker}
                        variant="outline"
                        size="sm"
                        className="bg-green-600/20 border-green-500/50 hover:bg-green-600/30"
                      >
                        {isTestingSpeaker ? (
                          <>
                            <Square className="w-4 h-4 mr-2" />
                            Çalıyor...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Test Et
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Voice Settings */}
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-purple-400" />
                    Ses Ayarları
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-gray-300">Bas Konuş</span>
                          <p className="text-xs text-gray-400">Tuşa basılı tutarak konuş</p>
                        </div>
                        <Switch
                          checked={settings.voice?.pushToTalk}
                          onCheckedChange={(checked) => handleSettingChange('voice', 'pushToTalk', checked)}
                        />
                      </div>

                      {settings.voice?.pushToTalk && (
                        <div>
                          <Label className="text-gray-300">Bas-Konuş Tuşu</Label>
                          <div className="mt-2 space-y-3">
                            <div className="flex gap-2">
                              <Select 
                                value={settings.voice?.pushToTalkKey || 'Space'} 
                                onValueChange={(value) => handleSettingChange('voice', 'pushToTalkKey', value)}
                              >
                                <SelectTrigger className="flex-1 bg-black/30 border-white/20 text-white">
                                  <SelectValue placeholder="Tuş seçin" />
                                </SelectTrigger>
                                <SelectContent className="bg-black/90 border-white/20 text-white">
                                  <SelectItem value="Space" className="focus:bg-white/10 focus:text-white">⌨️ Space (Boşluk)</SelectItem>
                                  <SelectItem value="ControlLeft" className="focus:bg-white/10 focus:text-white">⌨️ Sol Ctrl</SelectItem>
                                  <SelectItem value="ControlRight" className="focus:bg-white/10 focus:text-white">⌨️ Sağ Ctrl</SelectItem>
                                  <SelectItem value="AltLeft" className="focus:bg-white/10 focus:text-white">⌨️ Sol Alt</SelectItem>
                                  <SelectItem value="AltRight" className="focus:bg-white/10 focus:text-white">⌨️ Sağ Alt</SelectItem>
                                  <SelectItem value="ShiftLeft" className="focus:bg-white/10 focus:text-white">⌨️ Sol Shift</SelectItem>
                                  <SelectItem value="ShiftRight" className="focus:bg-white/10 focus:text-white">⌨️ Sağ Shift</SelectItem>
                                  <SelectItem value="KeyX" className="focus:bg-white/10 focus:text-white">⌨️ X</SelectItem>
                                  <SelectItem value="KeyC" className="focus:bg-white/10 focus:text-white">⌨️ C</SelectItem>
                                  <SelectItem value="KeyV" className="focus:bg-white/10 focus:text-white">⌨️ V</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setIsListeningForKey(true);
                                  const handleKeyDown = (e) => {
                                    e.preventDefault();
                                    const keyName = e.code;
                                    handleSettingChange('voice', 'pushToTalkKey', keyName);
                                    document.removeEventListener('keydown', handleKeyDown);
                                    setIsListeningForKey(false);
                                  };
                                  document.addEventListener('keydown', handleKeyDown);
                                }}
                                disabled={isListeningForKey}
                                className={`bg-blue-600/20 border-blue-500/50 hover:bg-blue-600/30 ${isListeningForKey ? 'bg-green-600/20 border-green-500/50 animate-pulse' : ''}`}
                              >
                                {isListeningForKey ? 'Tuş Bekleniyor...' : 'Tuş Ata'}
                              </Button>
                            </div>
                            <div className="text-xs text-gray-400 bg-black/20 p-2 rounded border border-white/10">
                              <strong>Şu anki tuş:</strong> <span className="text-blue-400 font-medium">{formatKeyName(settings.voice?.pushToTalkKey || 'Space')}</span>
                              <br />{isListeningForKey ? (
                                <span className="text-green-400">🎯 İstediğiniz tuşa basın...</span>
                              ) : (
                                <span>"Tuş Ata" butonuna tıklayın ve istediğiniz tuşa basın, veya yukarıdaki listeden seçin.</span>
                              )}
                              <br />Önerilen: Space (Boşluk), Ctrl, veya X
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-gray-300">Otomatik Kazanç Kontrolü</span>
                          <p className="text-xs text-gray-400">Ses seviyesini otomatik ayarla</p>
                        </div>
                        <Switch
                          checked={settings.voice?.autoGainControl}
                          onCheckedChange={(checked) => handleSettingChange('voice', 'autoGainControl', checked)}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-gray-300">Yankı İptali</span>
                          <p className="text-xs text-gray-400">Yankı efektini kaldır</p>
                        </div>
                        <Switch
                          checked={settings.voice?.echoCancellation}
                          onCheckedChange={(checked) => handleSettingChange('voice', 'echoCancellation', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-gray-300">Gürültü Bastırma</span>
                          <p className="text-xs text-gray-400">Arka plan gürültüsünü azalt</p>
                        </div>
                        <Switch
                          checked={settings.voice?.noiseSuppression}
                          onCheckedChange={(checked) => handleSettingChange('voice', 'noiseSuppression', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Camera Settings */}
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Camera className="w-5 h-5 mr-2 text-red-400" />
                    Kamera Ayarları
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-white font-medium">Kamera Erişimi</span>
                        <p className="text-gray-400 text-sm">Video görüşmelerinde kamera kullanımını etkinleştir</p>
                      </div>
                      <Switch
                        checked={settings.voice?.enableCamera}
                        onCheckedChange={(checked) => handleSettingChange('voice', 'enableCamera', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-white font-medium">Video Kalitesi</span>
                        <p className="text-gray-400 text-sm">Video akış kalitesini ayarla</p>
                      </div>
                      <Select 
                        value={settings.voice?.videoQuality || '720p'} 
                        onValueChange={(value) => handleSettingChange('voice', 'videoQuality', value)}
                      >
                        <SelectTrigger className="w-32 bg-black/30 border-white/20 text-white">
                          <SelectValue placeholder="Kalite seçin" />
                        </SelectTrigger>
                        <SelectContent className="">
                          <SelectItem value="360p">360p</SelectItem>
                          <SelectItem value="720p">720p</SelectItem>
                          <SelectItem value="1080p">1080p</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="p-6 space-y-6 overflow-y-auto max-h-[calc(80vh-8rem)]">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Bildirimler</h2>
                  <p className="text-gray-400">Hangi bildirimleri almak istediğinizi seçin.</p>
                </div>

                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-white font-medium">Masaüstü Bildirimlerini Etkinleştir</span>
                        <p className="text-gray-400 text-sm">Mesajlar ve aramalar hakkında bildirim al</p>
                      </div>
                      <Switch
                        checked={settings.notifications?.desktop}
                        onCheckedChange={(checked) => handleSettingChange('notifications', 'desktop', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-white font-medium">Ses Efektleri</span>
                        <p className="text-gray-400 text-sm">Çeşitli eylemler için ses çal</p>
                      </div>
                      <Switch
                        checked={settings.notifications?.soundEffects}
                        onCheckedChange={(checked) => handleSettingChange('notifications', 'soundEffects', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-white font-medium">Mesaj Bildirimleri</span>
                        <p className="text-gray-400 text-sm">Yeni mesajlar hakkında bildirim al</p>
                      </div>
                      <Switch
                        checked={settings.notifications?.messageNotifications}
                        onCheckedChange={(checked) => handleSettingChange('notifications', 'messageNotifications', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-white font-medium">Arama Bildirimleri</span>
                        <p className="text-gray-400 text-sm">Gelen aramalar hakkında bildirim al</p>
                      </div>
                      <Switch
                        checked={settings.notifications?.callNotifications}
                        onCheckedChange={(checked) => handleSettingChange('notifications', 'callNotifications', checked)}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Privacy Tab */}
              <TabsContent value="privacy" className="p-6 space-y-6 overflow-y-auto max-h-[calc(80vh-8rem)]">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Gizlilik ve Güvenlik</h2>
                  <p className="text-gray-400">Kimler size nasıl ulaşabilir kontrol edin.</p>
                </div>

                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                  <h3 className="text-lg font-semibold mb-4">Gizlilik Ayarları</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Sunucu üyelerinden direkt mesajlara izin ver</span>
                      <Switch 
                        checked={settings.privacy?.allowDirectMessages}
                        onCheckedChange={(checked) => handleSettingChange('privacy', 'allowDirectMessages', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Arkadaşlık isteklerini etkinleştir</span>
                      <Switch 
                        checked={settings.privacy?.enableFriendRequests}
                        onCheckedChange={(checked) => handleSettingChange('privacy', 'enableFriendRequests', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">Çevrimiçi durumu göster</span>
                      <Switch 
                        checked={settings.privacy?.showOnlineStatus}
                        onCheckedChange={(checked) => handleSettingChange('privacy', 'showOnlineStatus', checked)}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Save Button */}
        <div className="absolute bottom-4 right-4 flex items-center space-x-2">
          {hasChanges && (
            <span className="text-yellow-400 text-sm">Kaydedilmemiş değişiklikleriniz var</span>
          )}
          <Button 
            onClick={handleSave} 
            disabled={loading || !hasChanges}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserSettingsModal;