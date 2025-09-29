import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react';

import { GridBeams } from '@/registry/magicui/grid-beams';
import { InteractiveHoverButton } from '@/registry/magicui/interactive-hover-button';

import { useAuthForm } from '../hooks/useAuthForm';
import { AUTH_SUCCESS_MESSAGES, AUTH_ERRORS } from '../constants';

/**
 * LoginForm Component - Discord Style
 * Clean, reusable login form with proper validation and error handling
 */
export default function LoginForm({ onToggleMode, onBack }) {
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

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
      email: 'test@fluxy.com', // Pre-filled for testing
      password: 'test123', // Pre-filled for testing
    },
    ['email', 'password']
  );

  const onSubmit = async (data) => {
    const result = await login(data);
    
    if (result.success) {
      toast.success(AUTH_SUCCESS_MESSAGES.LOGIN);
      return result;
    } else {
      const errorMessage = result.error || AUTH_ERRORS.INVALID_CREDENTIALS;
      toast.error(errorMessage);
      return result;
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    await handleSubmit(onSubmit);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center p-4 relative overflow-hidden">
      <GridBeams className="absolute inset-0 opacity-30" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-8 border border-white/10 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="absolute left-8 p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-white">F</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Tekrar Hoş Geldin!</h1>
            <p className="text-gray-400">Hesabına giriş yap ve sohbete devam et</p>
          </div>

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="space-y-6">
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
                      : 'border-gray-600 focus:ring-purple-500/50'
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
                      : 'border-gray-600 focus:ring-purple-500/50'
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

            {/* Submit Button */}
            <InteractiveHoverButton
              type="submit"
              disabled={isSubmitting || !isValid}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Giriş yapılıyor...
                </div>
              ) : (
                'Giriş Yap'
              )}
            </InteractiveHoverButton>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Hesabın yok mu?{' '}
              <button
                onClick={onToggleMode}
                className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                Kayıt ol
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
