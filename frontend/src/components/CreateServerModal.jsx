import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { X, Upload, Hash, Sparkles, Users, Star, Search, Palette, Zap, Shield, Globe, Crown } from 'lucide-react';
import { serverAPI, templatesAPI } from '../services/api';
import { toast } from 'sonner';

const CreateServerModal = ({ isOpen, onClose, onServerCreated }) => {
  const [currentStep, setCurrentStep] = useState('template'); // 'template', 'confirm', 'customize'
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: false
  });
  const [iconPreview, setIconPreview] = useState(null);

  // Debug useEffect for currentStep
  useEffect(() => {
    // console.log('Current step changed:', currentStep);
    // console.log('Selected template:', selectedTemplate);
  }, [currentStep, selectedTemplate]);

  // Load templates and categories
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      loadCategories();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      // console.log('=== Loading templates ===');
      // console.log('Selected category:', selectedCategory);
      const response = await templatesAPI.getTemplates({
        category: selectedCategory,
        limit: 20
      });
      // console.log('Templates response:', response);
      // console.log('Templates count:', response.templates?.length);
      setTemplates(response.templates);
      setLoading(false);
    } catch (error) {
      // console.error('Template yükleme hatası:', error);
      toast.error('Şablonlar yüklenemedi');
      setLoading(false);
    }
  };  const loadCategories = async () => {
    try {
      const response = await templatesAPI.getCategories();
      setCategories(response);
    } catch (error) {
    }
  };

  useEffect(() => {
    if (isOpen && selectedCategory !== 'all') {
      loadTemplates();
    }
  }, [selectedCategory]);

  const handleTemplateSelect = (template) => {
    // console.log('=== handleTemplateSelect called ===');
    // console.log('Template seçildi:', template);
    // console.log('Template.template:', template?.template);
    // console.log('Template.template.server:', template?.template?.server);
    
    setSelectedTemplate(template);
    // console.log('Setting currentStep to confirm...');
    setCurrentStep('confirm');
    
    // console.log('Current step set to confirm');
    // console.log('=== handleTemplateSelect finished ===');
  };

  const handleCustomServer = () => {
    setSelectedTemplate(null);
    setCurrentStep('confirm');
  };

  const handleConfirmContinue = () => {
    if (selectedTemplate) {
      setFormData({
        name: selectedTemplate?.template?.server?.name || '',
        description: selectedTemplate?.template?.server?.description || '',
        isPublic: selectedTemplate?.template?.server?.isPublic ?? false
      });
      setIconPreview(selectedTemplate?.template?.server?.icon || '');
    } else {
      setFormData({
        name: '',
        description: '',
        isPublic: false
      });
      setIconPreview(null);
    }
    setCurrentStep('customize');
  };

  const handleBackToTemplates = () => {
    setCurrentStep('template');
    setSelectedTemplate(null);
    setFormData({ name: '', description: '', isPublic: false });
    setIconPreview(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleIconUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setIconPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Sunucu adı gerekli');
      return;
    }

    setLoading(true);

    try {
      let response;

      if (selectedTemplate) {
        // Create server from template
        response = await templatesAPI.useTemplate(selectedTemplate._id, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          icon: iconPreview
        });
      } else {
        // Create custom server
        response = await serverAPI.createServer({
          name: formData.name.trim(),
          description: formData.description.trim(),
          isPublic: formData.isPublic,
          icon: iconPreview
        });
      }

      toast.success('Sunucu başarıyla oluşturuldu!');
      onServerCreated(response.server);
      handleClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Sunucu oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep('template');
    setSelectedTemplate(null);
    setFormData({ name: '', description: '', isPublic: false });
    setIconPreview(null);
    setSearchQuery('');
    onClose();
  };

  if (!isOpen) return null;

  // Template translations
  const translateTemplate = (template) => {
    const nameTranslations = {
      // Gaming templates - expanded
      'Gaming Community': 'Oyun Topluluğu',
      'Gaming Hub': 'Oyun Merkezi',
      'Gaming Lounge': 'Oyun Salonu',
      'Esports Team': 'E-Spor Takımı',
      'Game Dev Studio': 'Oyun Geliştirme Stüdyosu',
      'Gaming Zone': 'Oyun Bölgesi',
      'Gamer Hangout': 'Oyuncu Buluşma Yeri',
      'Game Server': 'Oyun Sunucusu',
      'PC Gaming': 'PC Oyun',
      'Console Gaming': 'Konsol Oyun',
      
      // Music templates - expanded
      'Music Community': 'Müzik Topluluğu',
      'Music Production': 'Müzik Prodüksiyon',
      'Music School': 'Müzik Okulu',
      'Band Practice': 'Grup Provası',
      'Music Festival': 'Müzik Festivali',
      'Music Studio': 'Müzik Stüdyosu',
      'Music Lounge': 'Müzik Salonu',
      'Music Academy': 'Müzik Akademisi',
      'Music Hub': 'Müzik Merkezi',
      'Songwriters': 'Şarkı Sözü Yazarları',
      
      // Study templates - expanded
      'Study Group': 'Çalışma Grubu',
      'Homework Help': 'Ödev Yardımı',
      'Class Discussion': 'Sınıf Tartışması',
      'Study Buddies': 'Çalışma Arkadaşları',
      'Academic Club': 'Akademik Kulüp',
      'Study Zone': 'Çalışma Bölgesi',
      'Exam Prep': 'Sınav Hazırlığı',
      'Research Group': 'Araştırma Grubu',
      'Learning Hub': 'Öğrenme Merkezi',
      'Student Community': 'Öğrenci Topluluğu',
      
      // Art templates - expanded
      'Art Community': 'Sanat Topluluğu',
      'Digital Art': 'Dijital Sanat',
      'Art School': 'Sanat Okulu',
      'Creative Hub': 'Yaratıcı Merkez',
      'Artist Collective': 'Sanatçı Kolektifi',
      'Art Gallery': 'Sanat Galerisi',
      'Design Studio': 'Tasarım Stüdyosu',
      'Art Lounge': 'Sanat Salonu',
      'Creative Space': 'Yaratıcı Alan',
      'Art Academy': 'Sanat Akademisi',
      
      // Business templates - expanded
      'Business Network': 'İş Ağı',
      'Startup Hub': 'Girişim Merkezi',
      'Professional Community': 'Profesyonel Topluluk',
      'Team Collaboration': 'Takım İş Birliği',
      'Corporate Office': 'Kurumsal Ofis',
      'Business Hub': 'İş Merkezi',
      'Entrepreneur Club': 'Girişimci Kulübü',
      'Workplace': 'Çalışma Yeri',
      'Business Lounge': 'İş Salonu',
      'Corporate Network': 'Kurumsal Ağ',
      
      // Other categories - expanded
      'Community Hub': 'Topluluk Merkezi',
      'Social Club': 'Sosyal Kulüp',
      'Discussion Forum': 'Tartışma Forumu',
      'Creative Space': 'Yaratıcı Alan',
      'General Community': 'Genel Topluluk',
      'Social Network': 'Sosyal Ağ',
      'Community Center': 'Topluluk Merkezi',
      'Discussion Group': 'Tartışma Grubu',
      'Social Hub': 'Sosyal Merkez',
      'General Chat': 'Genel Sohbet'
    };

    const descriptionTranslations = {
      // Gaming descriptions
      'A place for gamers to connect and play together': 'Oyuncuların bir araya gelip birlikte oynaması için bir yer',
      'Central hub for gaming discussions and events': 'Oyun tartışmaları ve etkinlikleri için merkezi merkez',
      'Relax and chat with fellow gamers': 'Diğer oyuncularla rahatla ve sohbet et',
      'Coordinate matches and practice sessions': 'Maçları koordine et ve antrenman seansları yap',
      'Collaborate on game development projects': 'Oyun geliştirme projelerinde işbirliği yap',
      'Gaming zone for all types of games': 'Tüm oyun türleri için oyun bölgesi',
      'Hang out and play with other gamers': 'Diğer oyuncularla takıl ve oyna',
      'Server for gaming community': 'Oyun topluluğu için sunucu',
      'PC gaming community and discussions': 'PC oyun topluluğu ve tartışmaları',
      'Console gaming discussions and matches': 'Konsol oyun tartışmaları ve maçları',

      // Music descriptions
      'Connect with music lovers and share your passion': 'Müzik severlerle bağlantı kur ve tutkusunu paylaş',
      'Create and share your music with the community': 'Müziğini oluştur ve toplulukla paylaş',
      'Learn and teach music with fellow musicians': 'Diğer müzisyenlerle müzik öğren ve öğret',
      'Practice and jam with your band members': 'Grup üyelerinle prova yap ve jam yap',
      'Organize and promote music events': 'Müzik etkinliklerini organize et ve tanıt',
      'Professional music production studio': 'Profesyonel müzik prodüksiyon stüdyosu',
      'Relax and enjoy music with others': 'Diğerleriyle rahatla ve müziğin tadını çıkar',
      'Learn music from professional teachers': 'Profesyonel öğretmenlerden müzik öğren',
      'Central hub for music lovers': 'Müzik severleri için merkezi merkez',
      'Write and share song lyrics': 'Şarkı sözleri yaz ve paylaş',

      // Study descriptions
      'Study together and help each other succeed': 'Birlikte çalış ve birbirinize başarıda yardım et',
      'Get help with your homework assignments': 'Ödevlerinizde yardım alın',
      'Discuss class topics and share knowledge': 'Sınıf konularını tartış ve bilgi paylaş',
      'Find study partners for your courses': 'Derslerin için çalışma arkadaşları bul',
      'Join academic discussions and events': 'Akademik tartışmalara ve etkinliklere katıl',
      'Dedicated study area for students': 'Öğrenciler için özel çalışma alanı',
      'Prepare for exams together': 'Birlikte sınavlara hazırlan',
      'Research and academic discussions': 'Araştırma ve akademik tartışmalar',
      'Learning hub for all subjects': 'Tüm dersler için öğrenme merkezi',
      'Connect with fellow students': 'Diğer öğrencilerle bağlantı kur',

      // Art descriptions
      'Share your art and get inspired by others': 'Sanatını paylaş ve diğerlerinden ilham al',
      'Showcase your digital artwork': 'Dijital sanat eserlerini sergile',
      'Learn new art techniques and skills': 'Yeni sanat teknikleri ve becerileri öğren',
      'Creative space for artists to collaborate': 'Sanatçıların işbirliği yapması için yaratıcı alan',
      'Connect with fellow artists': 'Diğer sanatçılarla bağlantı kur',
      'Virtual art gallery for exhibitions': 'Sergiler için sanal sanat galerisi',
      'Design and create together': 'Birlikte tasarla ve yarat',
      'Relax and discuss art': 'Rahatla ve sanatı tartış',
      'Space for creative expression': 'Yaratıcı ifade için alan',
      'Learn art from professionals': 'Profesyonellerden sanat öğren',

      // Business descriptions
      'Network with professionals in your field': 'Alanındaki profesyonellerle ağ kur',
      'Build your startup with like-minded people': 'Benzer düşünen insanlarla girişimini oluştur',
      'Professional networking and discussions': 'Profesyonel ağ kurma ve tartışmalar',
      'Collaborate on projects and tasks': 'Projelerde ve görevlerde işbirliği yap',
      'Corporate communication and updates': 'Kurumsal iletişim ve güncellemeler',
      'Business networking and opportunities': 'İş ağı ve fırsatlar',
      'Entrepreneur community and support': 'Girişimci topluluğu ve destek',
      'Professional workplace discussions': 'Profesyonel çalışma yeri tartışmaları',
      'Business meetings and collaborations': 'İş toplantıları ve işbirlikleri',
      'Corporate networking platform': 'Kurumsal ağ kurma platformu',

      // Other descriptions
      'General community discussions': 'Genel topluluk tartışmaları',
      'Social gatherings and events': 'Sosyal toplantılar ve etkinlikler',
      'Open forum for discussions': 'Tartışmalar için açık forum',
      'Express your creativity': 'Yaratıcılığını ifade et',
      'Connect with people': 'İnsanlarla bağlantı kur',
      'Social networking and connections': 'Sosyal ağ ve bağlantılar',
      'Community center for all topics': 'Tüm konular için topluluk merkezi',
      'Group discussions and conversations': 'Grup tartışmaları ve konuşmalar',
      'Central hub for social interactions': 'Sosyal etkileşimler için merkezi merkez',
      'Casual chat and discussions': 'Günlük sohbet ve tartışmalar'
    };

    return {
      ...template,
      name: nameTranslations[template.name] || template.name,
      description: descriptionTranslations[template.description] || template.description
    };
  };

  const translatedTemplates = templates.map(translateTemplate);
  const filteredTemplates = translatedTemplates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/80 via-purple-900/20 to-blue-900/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl mx-auto max-h-[85vh] overflow-hidden border border-white/10">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 p-6">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-cyan-600/20 backdrop-blur-sm"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {currentStep === 'template' ? 'Sunucunu Oluştur' : 
                   currentStep === 'confirm' ? 'Seçiminizi Onaylayın' : 'Sunucunu Özelleştir'}
                </h2>
                <p className="text-purple-100 text-sm mt-1">
                  {currentStep === 'template' ? 'Topluluğuna özel bir sunucu oluştur' : 
                   currentStep === 'confirm' ? 'Seçiminizi gözden geçirin' : 'Sunucunu kişiselleştir'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-xl flex items-center justify-center text-white transition-all duration-200 hover:scale-105"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-200px)] p-6">
          {currentStep === 'template' ? (
            /* Template Selection */
            <div className="space-y-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto">
                  <Palette className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-2">Şablon Seç</h3>
                  <p className="text-gray-400 text-lg">Hazır şablonlarla hızlıca başla</p>
                </div>
              </div>

              {/* Search */}
              <div className="relative max-w-md mx-auto">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Şablon ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 h-12 rounded-xl focus:border-purple-500 focus:ring-purple-500/20"
                />
              </div>

              {/* Categories */}
              <div className="flex flex-wrap justify-center gap-3">
                {categories.map((category) => {
                  const categoryTranslations = {
                    'gaming': 'Oyun',
                    'music': 'Müzik', 
                    'study': 'Çalışma',
                    'art': 'Sanat',
                    'business': 'İş',
                    'community': 'Topluluk',
                    'other': 'Diğer',
                    'all': 'Tümü',
                    'social': 'Sosyal',
                    'education': 'Eğitim',
                    'creative': 'Yaratıcı',
                    'professional': 'Profesyonel',
                    'entertainment': 'Eğlence',
                    'technology': 'Teknoloji'
                  };

                  return (
                    <button
                      key={category.value}
                      onClick={() => setSelectedCategory(category.value)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 hover:scale-105 ${
                        selectedCategory === category.value
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25'
                          : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 border border-gray-600'
                      }`}
                    >
                      {categoryTranslations[category.value] || category.label}
                    </button>
                  );
                })}
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                  <p className="text-gray-400 text-lg">Şablonlar yükleniyor...</p>
                </div>
              ) : (
                <>
                  {/* Custom Server Option - Centered */}
                  <div className="col-span-full flex justify-center mb-8">
                    <div
                      onClick={handleCustomServer}
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-600 hover:border-purple-500/50 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/10 w-full max-w-md"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative p-6">
                        <div className="flex items-center space-x-4 mb-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Zap className="w-7 h-7 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-white text-lg group-hover:text-purple-300 transition-colors">Kendi Sunucumu Oluştur</h4>
                            <p className="text-sm text-gray-400">Sıfırdan başla</p>
                          </div>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed">
                          Kendi kanallarını ve rollerini oluşturduğum özel bir sunucu oluştur.
                        </p>
                        <div className="mt-6 flex justify-center">
                          <div className="flex items-center text-purple-400 text-lg font-semibold space-x-3">
                            <span>Başla</span>
                            <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Template Options */}
                  <div className="col-span-full">
                    {/* console.log('=== Rendering templates ===') */}
                    {/* console.log('Templates array:', templates) */}
                    {/* console.log('Filtered templates:', filteredTemplates) */}
                    {/* console.log('Filtered templates length:', filteredTemplates.length) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredTemplates.map((template) => {
                        // console.log('Rendering template:', template._id, template.name);
                        return (
                          <div
                            key={template._id}
                            onClick={() => {
                              // console.log('=== Template clicked ===');
                              // console.log('Template clicked:', template);
                              // console.log('Template ID:', template._id);
                              // console.log('Template name:', template.name);
                              handleTemplateSelect(template);
                            }}
                            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-600 hover:border-purple-500/50 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/10"
                          >
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <div className="relative p-6">
                            <div className="flex items-center space-x-4 mb-4">
                              <div className="relative">
                                <img
                                  src={template.icon}
                                  alt={template.name}
                                  className="w-14 h-14 rounded-xl group-hover:scale-110 transition-transform duration-300"
                                />
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                                  <Crown className="w-3 h-3 text-white" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-white text-lg group-hover:text-purple-300 transition-colors truncate">
                                  {template.name}
                                </h4>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-300 border-purple-500/30">
                                    {template.category}
                                  </Badge>
                                  <div className="flex items-center space-x-1 text-xs text-gray-400">
                                    <Star className="w-3 h-3 text-yellow-400" />
                                    <span>{template.usageCount}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">
                              {template.description}
                            </p>
                            <div className="mt-4 flex items-center justify-between">
                              <div className="text-purple-400 text-sm font-medium">
                                <span>Kullan</span>
                              </div>
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                <Users className="w-3 h-3" />
                                <span>Popüler</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : currentStep === 'confirm' ? (
            /* Confirm Selection */
            <div className="space-y-8">
              {/* console.log('=== Rendering confirm step ===') */}
              {/* console.log('Current step:', currentStep) */}
              {/* console.log('Selected template:', selectedTemplate) */}
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-white mb-2">Seçiminizi Onaylayın</h3>
                  <p className="text-gray-400 text-lg">Devam etmek için seçiminizi gözden geçirin</p>
                </div>
              </div>

              {/* Selection Preview */}
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-600 rounded-2xl p-8">
                {selectedTemplate ? (
                  /* Template Preview */
                  <div className="space-y-6">
                    <div className="flex items-center space-x-4">
                      <img
                        src={selectedTemplate.icon}
                        alt={selectedTemplate.name}
                        className="w-16 h-16 rounded-xl"
                      />
                      <div className="flex-1">
                        <h4 className="font-bold text-white text-xl">{selectedTemplate.name}</h4>
                        <p className="text-gray-400">{selectedTemplate.description}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="text-xs bg-purple-500/20 text-purple-300 border-purple-500/30">
                          {selectedTemplate.category}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-600">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">{selectedTemplate.template.channels.length}</div>
                        <div className="text-sm text-gray-400">Kanal</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">{selectedTemplate.template.roles.length}</div>
                        <div className="text-sm text-gray-400">Rol</div>
                      </div>
                    </div>

                    <div className="text-center pt-4">
                      <p className="text-gray-400 text-sm">
                        Bu şablonu kullanarak sunucunuz oluşturulacak. Devam etmek için "Devam" butonuna tıklayın.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Custom Server Preview */
                  <div className="space-y-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center">
                        <Zap className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-white text-xl">Kendi Sunucum</h4>
                        <p className="text-gray-400">Sıfırdan kendi sunucunuzu oluşturun</p>
                      </div>
                    </div>

                    <div className="text-center pt-4">
                      <p className="text-gray-400 text-sm">
                        Kendi kanallarınızı ve rollerinizi oluşturabileceğiniz boş bir sunucu oluşturulacak.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackToTemplates}
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500 h-12 rounded-xl"
                >
                  ← Geri Dön
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmContinue}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white h-12 rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 hover:scale-105"
                >
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-5 h-5" />
                    <span>Devam</span>
                  </div>
                </Button>
              </div>
            </div>
          ) : (
            /* Server Customization */
            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              {/* Template Info */}
              {selectedTemplate && (
                <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <img
                        src={selectedTemplate.icon}
                        alt={selectedTemplate.name}
                        className="w-12 h-12 rounded-xl"
                      />
                      <div>
                        <h4 className="font-bold text-white text-lg">{selectedTemplate.name}</h4>
                        <p className="text-gray-400">{selectedTemplate.description}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={handleBackToTemplates}
                      variant="outline"
                      className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10 hover:border-purple-500/50"
                    >
                      Şablonu Değiştir
                    </Button>
                  </div>
                  <div className="flex items-center space-x-6 mt-4 text-sm text-gray-400">
                    <span className="flex items-center space-x-2">
                      <Hash className="w-4 h-4" />
                      <span>{selectedTemplate.template.channels.length} kanal</span>
                    </span>
                    <span className="flex items-center space-x-2">
                      <Shield className="w-4 h-4" />
                      <span>{selectedTemplate.template.roles.length} rol</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Server Icon */}
              <div className="flex flex-col items-center space-y-6">
                <div className="relative group">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-gray-600 group-hover:border-purple-500/50 transition-colors duration-300">
                    {iconPreview ? (
                      <img
                        src={iconPreview}
                        alt="Server icon"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Hash className="w-10 h-10 text-gray-400" />
                    )}
                  </div>
                  <label className="absolute -bottom-3 -right-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl p-3 cursor-pointer transition-all duration-300 hover:scale-105 shadow-lg shadow-purple-500/25">
                    <Upload className="w-5 h-5 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleIconUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-sm mb-1">
                    Sunucu İkonu
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG veya GIF • Max 5MB
                  </p>
                </div>
              </div>

              {/* Server Name */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-300">
                  Sunucu Adı <span className="text-red-400">*</span>
                </label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Sunucunuzun adını girin"
                  className="bg-gray-800/50 border-gray-600 text-white placeholder-gray-400 h-12 rounded-xl focus:border-purple-500 focus:ring-purple-500/20 text-lg"
                  maxLength={50}
                  required
                />
                <p className="text-xs text-gray-500 flex justify-between">
                  <span>En az 3 karakter</span>
                  <span>{formData.name.length}/50 karakter</span>
                </p>
              </div>

              {/* Server Description */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-300">
                  Açıklama
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Sunucunuzun ne hakkında olduğunu anlatın..."
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none text-lg"
                  rows={4}
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 flex justify-between">
                  <span>İsteğe bağlı</span>
                  <span>{formData.description.length}/200 karakter</span>
                </p>
              </div>

              {/* Server Privacy */}
              <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-600 rounded-xl p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl flex items-center justify-center">
                    <Globe className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <input
                        type="checkbox"
                        id="isPublic"
                        name="isPublic"
                        checked={formData.isPublic}
                        onChange={handleChange}
                        className="w-5 h-5 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-offset-0"
                      />
                      <label htmlFor="isPublic" className="text-lg font-semibold text-white cursor-pointer">
                        Bu sunucuyu herkese açık yap
                      </label>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      Açık sunucular herkes tarafından keşfedilebilir ve katılabilir. Özel sunucular sadece davet linki ile katılabilir.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-4 pt-6 border-t border-gray-600">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackToTemplates}
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500 h-12 rounded-xl"
                  disabled={loading}
                >
                  ← Geri Dön
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white h-12 rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 hover:scale-105"
                  disabled={loading || !formData.name.trim()}
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Oluşturuluyor...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-5 h-5" />
                      <span>{selectedTemplate ? 'Şablondan Oluştur' : 'Sunucu Oluştur'}</span>
                    </div>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateServerModal;
