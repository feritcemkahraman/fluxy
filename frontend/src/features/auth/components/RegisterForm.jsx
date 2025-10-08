import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, User, Loader2, ArrowLeft } from 'lucide-react';
import { InteractiveHoverButton } from '@/registry/magicui/interactive-hover-button';
import { GridBeams } from '@/registry/magicui/grid-beams';

import { useAuthForm } from '../hooks/useAuthForm';
import { AUTH_SUCCESS_MESSAGES, AUTH_ERRORS } from '../constants';

/**
 * RegisterForm Component - Discord Style
 * Clean, reusable registration form with proper validation
 */
export default function RegisterForm({ onToggleMode, onBack }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register } = useAuth();

  const {
    formData,
    errors,
    isSubmitting,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit
  } = useAuthForm(
    {
      username: '',
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    ['username', 'displayName', 'email', 'password', 'confirmPassword']
  );

  const onSubmit = async (data) => {
    const result = await register(data);
    
    if (result.success) {
      toast.success(AUTH_SUCCESS_MESSAGES.REGISTER);
      return result;
    } else {
      const errorMessage = result.error || AUTH_ERRORS.SERVER_ERROR;
      toast.error(errorMessage);
      return result;
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    await handleSubmit(onSubmit);
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#030712] flex items-center justify-center p-4 overflow-hidden" style={{overflowX: 'hidden', width: '100vw'}}>
      <GridBeams
        className="absolute inset-0 w-full h-full"
        gridSize={48}
        gridColor="rgba(94, 234, 212, 0.18)"
        rayCount={20}
        rayOpacity={0.45}
        raySpeed={1.3}
        rayLength="60vh"
        gridFadeStart={10}
        gridFadeEnd={85}
        backgroundColor="#030712"
      />
      
      <div className="w-full max-w-md relative z-10">
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4 relative">
              <button
                onClick={onBack || onToggleMode}
                className="absolute left-0 p-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center justify-center gap-3">
                <img src="fluxy.png" alt="Fluxy" className="h-12 w-12" />
                <h1 className="text-3xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-500 animate-pulse drop-shadow-[0_0_15px_rgba(94,234,212,0.5)]">
                  FLUXY
                </h1>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Hesap Oluştur</h1>
            <p className="text-gray-400">Fluxy topluluğuna katıl ve sohbete başla</p>
          </div>

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* Username Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Kullanıcı Adı
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-800/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.username 
                      ? 'border-red-500 focus:ring-red-500/50' 
                      : 'border-gray-600 focus:ring-cyan-500/50'
                  }`}
                  placeholder="kullaniciadi"
                />
              </div>
              {errors.username && (
                <p className="mt-1 text-sm text-red-400">{errors.username}</p>
              )}
            </div>

            {/* Display Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Görünen Ad
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-800/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.displayName 
                      ? 'border-red-500 focus:ring-red-500/50' 
                      : 'border-gray-600 focus:ring-cyan-500/50'
                  }`}
                  placeholder="Görünen Adınız"
                />
              </div>
              {errors.displayName && (
                <p className="mt-1 text-sm text-red-400">{errors.displayName}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                E-posta
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full pl-10 pr-4 py-3 bg-gray-800/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.email 
                      ? 'border-red-500 focus:ring-red-500/50' 
                      : 'border-gray-600 focus:ring-cyan-500/50'
                  }`}
                  placeholder="ornek@email.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full pl-10 pr-12 py-3 bg-gray-800/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.password 
                      ? 'border-red-500 focus:ring-red-500/50' 
                      : 'border-gray-600 focus:ring-cyan-500/50'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Şifre Tekrar
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full pl-10 pr-12 py-3 bg-gray-800/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.confirmPassword 
                      ? 'border-red-500 focus:ring-red-500/50' 
                      : 'border-gray-600 focus:ring-cyan-500/50'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Terms and Privacy Notice */}
            <div className="text-center text-sm text-gray-400">
              Kaydolarak{' '}
              <a href="#" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                Hizmet Şartları
              </a>
              {' '}ve{' '}
              <a href="#" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                Gizlilik Politikası
              </a>
              'ı kabul etmiş olursunuz.
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <InteractiveHoverButton
                type="submit"
                disabled={isSubmitting || !isValid}
                className="border-transparent bg-cyan-500/80 text-base font-semibold text-white hover:bg-cyan-400/80"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Hesap oluşturuluyor...
                  </div>
                ) : (
                  'Hesap Oluştur'
                )}
              </InteractiveHoverButton>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
