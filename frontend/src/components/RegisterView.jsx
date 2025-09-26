import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowLeft,
  Loader2,
} from "lucide-react";

import { GridBeams } from "@/registry/magicui/grid-beams";
import { InteractiveHoverButton } from "@/registry/magicui/interactive-hover-button";

export default function RegisterView({ onToggleMode, onBack }) {
  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username) {
      toast.error("Kullanıcı adı gereklidir");
      return;
    }

    if (!formData.displayName) {
      toast.error("Görünen ad gereklidir");
      return;
    }

    if (!formData.email) {
      toast.error("E-posta gereklidir");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Şifreler eşleşmiyor");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Şifre en az 6 karakter olmalıdır");
      return;
    }

    setIsLoading(true);

    const result = await register({
      username: formData.username,
      displayName: formData.displayName,
      email: formData.email,
      password: formData.password,
    });

    if (result.success) {
      toast.success("Hesap başarıyla oluşturuldu!");
    } else {
      toast.error(result.error || "Kayıt oluşturulamadı");
    }

    setIsLoading(false);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#030712] text-white">
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
          <div className="w-full max-w-xl space-y-10">
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
              <div className="text-right text-xs uppercase tracking-[0.35em] text-white/40">
                Fluxy
              </div>
            </div>

            <div className="space-y-4 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
                Yeni Hesap
              </span>
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                Fluxy topluluğuna katıl
              </h1>
              <p className="text-sm text-white/60">
                Saniyeler içinde hesabını oluştur, arkadaşlarınla oyun ve sohbet odalarına katıl.
              </p>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-8 backdrop-blur">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="username" className="block text-xs font-semibold uppercase tracking-[0.25em] text-white/50">
                      KULLANICI ADI
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <User className="h-5 w-5 text-white/40" />
                      </div>
                      <input
                        id="username"
                        name="username"
                        type="text"
                        required
                        value={formData.username}
                        onChange={handleChange}
                        className="block w-full rounded-xl border border-white/20 bg-white/5 py-3 pl-12 pr-3 text-sm text-white placeholder-white/40 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/40"
                        placeholder="kullaniciadi"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="displayName" className="block text-xs font-semibold uppercase tracking-[0.25em] text-white/50">
                      GÖRÜNEN AD
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <User className="h-5 w-5 text-white/40" />
                      </div>
                      <input
                        id="displayName"
                        name="displayName"
                        type="text"
                        required
                        value={formData.displayName}
                        onChange={handleChange}
                        className="block w-full rounded-xl border border-white/20 bg-white/5 py-3 pl-12 pr-3 text-sm text-white placeholder-white/40 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/40"
                        placeholder="Görünen Adın"
                      />
                    </div>
                  </div>
                </div>

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

                <div className="grid gap-6 md:grid-cols-2">
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
                        type={showPassword ? "text" : "password"}
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className="block w-full rounded-xl border border-white/20 bg-white/5 py-3 pl-12 pr-12 text-sm text-white placeholder-white/40 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/40"
                        placeholder="Şifren"
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

                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="block text-xs font-semibold uppercase tracking-[0.25em] text-white/50">
                      ŞİFRE TEKRAR
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Lock className="h-5 w-5 text-white/40" />
                      </div>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="block w-full rounded-xl border border-white/20 bg-white/5 py-3 pl-12 pr-12 text-sm text-white placeholder-white/40 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/40"
                        placeholder="Şifreni doğrula"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/50 transition hover:text-white"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <InteractiveHoverButton
                    type="submit"
                    disabled={isLoading}
                    className="w-auto border-transparent bg-cyan-500/80 px-8 py-3 text-base font-semibold text-white hover:bg-cyan-400/80"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Hesap oluşturuluyor...
                      </span>
                    ) : (
                      "Fluxy’ye Katıl"
                    )}
                  </InteractiveHoverButton>
                </div>
              </form>

              <div className="mt-6 text-center text-sm text-white/60">
                Zaten hesabın var mı?
                <div className="mt-3 flex justify-center">
                  <InteractiveHoverButton
                    type="button"
                    onClick={onToggleMode}
                    className="border-transparent bg-cyan-500/80 px-6 py-2 text-sm font-semibold text-white hover:bg-cyan-400/80"
                  >
                    Giriş Yap
                  </InteractiveHoverButton>
                </div>
              </div>

              <div className="mt-4 text-center text-xs text-white/50">
                Kaydolarak{' '}
                <button
                  type="button"
                  className="font-semibold text-white/70 underline-offset-4 hover:underline"
                >
                  Hizmet Şartları
                </button>{' '}
                ve{' '}
                <button
                  type="button"
                  className="font-semibold text-white/70 underline-offset-4 hover:underline"
                >
                  Gizlilik Politikası
                </button>
                'nı kabul etmiş olursun.
              </div>
            </div>
          </div>
        </div>
      </GridBeams>
    </div>
  );
}
