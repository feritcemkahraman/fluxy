import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, User, Mail, Phone } from 'lucide-react';

export default function LoginForm({ onToggleMode }) {
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [contactMethod, setContactMethod] = useState('email'); // 'email' or 'phone'
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate contact method
    if (contactMethod === 'email' && !formData.email) {
      toast.error('E-posta gereklidir');
      return;
    }
    if (contactMethod === 'phone' && !formData.phone) {
      toast.error('Telefon numarası gereklidir');
      return;
    }

    setIsLoading(true);

    const loginData = {
      email: contactMethod === 'email' ? formData.email : '',
      phone: contactMethod === 'phone' ? formData.phone : '',
      password: formData.password,
    };

    const result = await login(loginData);
    
    if (result.success) {
      toast.success('Başarıyla giriş yapıldı!');
    } else {
      // Detailed error messages based on error type
      if (result.type === 'USER_NOT_FOUND') {
        toast.error('Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı');
      } else if (result.type === 'WRONG_PASSWORD') {
        toast.error('Şifre hatalı. Lütfen doğru şifreyi girin');
      } else {
        toast.error(result.error || 'Giriş başarısız. Lütfen tekrar deneyin.');
      }
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-indigo-600 rounded-lg flex items-center justify-center">
            <User size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Tekrar Hoş Geldiniz</h1>
          <p className="text-gray-400">Hesabınıza giriş yapın</p>
        </div>

        {/* Form Container */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Tekrar hoş geldiniz!</h2>
              <p className="text-gray-300">Sizi tekrar görmekten çok mutluyuz!</p>
            </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Contact Method Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Giriş yöntemi <span className="text-red-400">*</span>
              </label>
              <div className="flex rounded-md bg-gray-700 p-1">
                <button
                  type="button"
                  onClick={() => setContactMethod('email')}
                  className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                    contactMethod === 'email'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <Mail size={16} className="inline mr-2" />
                  E-posta
                </button>
                <button
                  type="button"
                  onClick={() => setContactMethod('phone')}
                  className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
                    contactMethod === 'phone'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <Phone size={16} className="inline mr-2" />
                  Telefon
                </button>
              </div>
            </div>

            {/* Email or Phone Input */}
            {contactMethod === 'email' ? (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  E-posta Adresi <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="E-posta adresinizi girin"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                  Telefon Numarası <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Telefon numaranızı girin"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Şifre <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pr-12 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Şifrenizi girin"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center text-gray-300">
                <input type="checkbox" className="mr-2 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500" />
                Beni hatırla
              </label>
              <button type="button" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                Şifremi unuttum?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Giriş yapılıyor...
                </div>
              ) : (
                'Giriş Yap'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-gray-400 text-sm">
              Hesabınız yok mu?{' '}
              <button
                onClick={onToggleMode}
                className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                Hesap Oluştur
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
