import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react';

import { GridBeams } from '@/registry/magicui/grid-beams';
import { InteractiveHoverButton } from '@/registry/magicui/interactive-hover-button';

export default function LoginForm({ onToggleMode, onBack }) {
  const [formData, setFormData] = useState({
    email: 'test@fluxy.com', // Pre-filled for testing
    password: 'test123', // Pre-filled for testing
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email) {
      toast.error('E-posta gereklidir');
      return;
    }

    if (!formData.password) {
      toast.error('Şifre gereklidir');
      return;
    }

    setIsLoading(true);

    const result = await login(formData);

    if (result.success) {
      toast.success('Başarıyla giriş yapıldı!');
    } else {
      toast.error(result.error || 'Giriş yapılamadı');
    }

    setIsLoading(false);
  };

  // Add auth-page class to body
  React.useEffect(() => {
    document.body.classList.add('auth-page');
    return () => document.body.classList.remove('auth-page');
  }, []);

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#030712] text-white" style={{overflowX: 'hidden', maxWidth: '100vw'}}>
      <GridBeams
        className="min-h-screen w-full"
        gridSize={48}
        gridColor="rgba(94, 234, 212, 0.18)"
        rayCount={18}
        rayOpacity={0.45}
        raySpeed={1.2}
        rayLength="60vh"
        gridFadeStart={12}
        gridFadeEnd={85}
        backgroundColor="#030712"
      >
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-16 sm:px-10">
          <div className="w-full max-w-md space-y-10">
            <div className="flex items-center justify-between">
              {onBack ? (
                <InteractiveHoverButton
                  type="button"
                  onClick={onBack}
                  className="border-transparent bg-cyan-500/80 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-400/80"
                  icon={ArrowLeft}
                  showArrow={false}
                >
                  Ana Sayfa
                </InteractiveHoverButton>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2 text-right text-xs uppercase tracking-[0.35em] text-white/40">
                <img src="/fluxy.png" alt="Fluxy" className="h-6 w-6" />
                Fluxy
              </div>
            </div>

            <div className="space-y-4 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
                Hoş Geldin
              </span>
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                Fluxy hesabına giriş yap
              </h1>
              <p className="text-sm text-white/60">
                Topluluğuna bağlanmak için e-posta ve şifren ile giriş yap.
              </p>
            </div>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/10/60 p-8 backdrop-blur">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-[0.25em] text-white/50">
                    E-POSTA
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Mail className="h-5 w-5 text-white/40" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="block w-full rounded-xl border border-white/20 bg-white/5 py-3 pl-12 pr-3 text-sm text-white placeholder-white/40 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/40"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-[0.25em] text-white/50">
                    ŞİFRE
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Lock className="h-5 w-5 text-white/40" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="block w-full rounded-xl border border-white/20 bg-white/5 py-3 pl-12 pr-12 text-sm text-white placeholder-white/40 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/40"
                      placeholder="Şifrenizi girin"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/50 transition hover:text-white"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-center">
                  <InteractiveHoverButton
                    type="submit"
                    disabled={isLoading}
                    className="w-auto justify-center border-transparent bg-cyan-500/80 px-8 py-3 text-base font-semibold text-white hover:bg-cyan-400/80"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Giriş yapılıyor...
                      </span>
                    ) : (
                      'Giriş Yap'
                    )}
                  </InteractiveHoverButton>
                </div>
              </form>

              <div className="mt-6 text-center text-sm text-white/60">
                Hesabın yok mu?
                <div className="mt-3 flex justify-center">
                  <InteractiveHoverButton
                    type="button"
                    onClick={onToggleMode}
                    className="border-transparent bg-cyan-500/80 px-6 py-2 text-sm font-semibold text-white hover:bg-cyan-400/80"
                  >
                    Hesap oluştur
                  </InteractiveHoverButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </GridBeams>
    </div>
  );
}