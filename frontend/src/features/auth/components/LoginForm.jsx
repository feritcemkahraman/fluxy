import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
// toast removed
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
      email: '',
      password: '',
    },
    ['email', 'password']
  );

  const onSubmit = async (data) => {
    const result = await login(data);
    
    if (result.success) {
      return result;
    } else {
      const errorMessage = result.error || AUTH_ERRORS.INVALID_CREDENTIALS;
      console.error('Login error:', errorMessage);
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
            <div className="flex items-center justify-center mb-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="absolute left-8 p-2 text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="flex items-center justify-center gap-3">
                <img src="fluxy.png" alt="Fluxy" className="h-12 w-12" />
                <h1 className="text-3xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-500 animate-pulse drop-shadow-[0_0_15px_rgba(94,234,212,0.5)]">
                  FLUXY
                </h1>
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

            {/* Submit Button */}
            <div className="flex justify-center">
              <InteractiveHoverButton
                type="submit"
                disabled={!isValid || isSubmitting}
                className="border-transparent bg-cyan-500/80 text-base font-semibold text-white hover:bg-cyan-400/80"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Giriş yapılıyor...
                  </>
                ) : (
                  'Giriş Yap'
                )}
              </InteractiveHoverButton>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Hesabın yok mu?{' '}
              <button
                onClick={onToggleMode}
                className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
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
