import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, User, Mail, Phone } from 'lucide-react';

export default function RegisterForm({ onToggleMode }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [contactMethod, setContactMethod] = useState('email'); // 'email' or 'phone'
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır');
      return;
    }

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

    const result = await register({
      username: formData.username,
      email: contactMethod === 'email' ? formData.email : '',
      phone: contactMethod === 'phone' ? formData.phone : '',
      password: formData.password,
    });
    
    if (result.success) {
      toast.success('Hesap başarıyla oluşturuldu! Yönlendiriliyor...');
      // AuthContext state'inin update olması için biraz bekle
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    } else {
      // Detailed error messages based on error type
      if (result.type === 'EMAIL_EXISTS') {
        toast.error('Bu e-posta adresi zaten kayıtlı. Farklı bir e-posta deneyin.');
      } else if (result.type === 'USERNAME_EXISTS') {
        toast.error('Bu kullanıcı adı zaten alınmış. Farklı bir kullanıcı adı deneyin.');
      } else {
        toast.error(result.error || 'Kayıt işlemi başarısız. Lütfen tekrar deneyin.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-indigo-600 rounded-lg flex items-center justify-center">
            <User size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Hesap Oluştur</h1>
          <p className="text-gray-400">Topluluğumuza katılın</p>
        </div>

        {/* Form Container */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-700">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Hesap oluşturun</h2>
              <p className="text-gray-300">Bugün topluluğumuza katılın!</p>
            </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Kullanıcı Adı <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Kullanıcı adınızı girin"
                />
              </div>
            </div>

            {/* Contact Method Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                İletişim Yöntemi <span className="text-red-400">*</span>
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
                  placeholder="Bir şifre oluşturun"
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

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Şifreyi Onayla <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 pr-12 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Şifrenizi onaylayın"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {formData.confirmPassword && (
                <div className="mt-2 text-xs">
                  {formData.password === formData.confirmPassword ? (
                    <span className="text-green-400">✓ Şifreler eşleşiyor</span>
                  ) : (
                    <span className="text-red-400">✗ Şifreler eşleşmiyor</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-start space-x-3 text-sm">
              <input 
                type="checkbox" 
                required
                className="mt-1 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-gray-300 leading-relaxed">
                <button type="button" className="text-indigo-400 hover:text-indigo-300 underline">
                  Hizmet Şartları
                </button>
                {' '}ve{' '}
                <button type="button" className="text-indigo-400 hover:text-indigo-300 underline">
                  Gizlilik Politikası
                </button>
                {'nı kabul ediyorum'}
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Hesap Oluşturuluyor...
                </div>
              ) : (
                'Hesap Oluştur'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-gray-400 text-sm">
              Zaten hesabınız var mı?{' '}
              <button
                onClick={onToggleMode}
                className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                Giriş Yap
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
