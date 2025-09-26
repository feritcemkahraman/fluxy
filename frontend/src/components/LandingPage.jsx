import React from "react";
import {
  GridBeams,
} from "@/registry/magicui/grid-beams";
import { InteractiveHoverButton } from "@/registry/magicui/interactive-hover-button";
import {
  ScrollVelocityContainer,
  ScrollVelocityRow,
} from "@/registry/magicui/scroll-based-velocity";
import { ShineBorder } from "@/registry/magicui/shine-border";
import { AnimatedList } from "@/registry/magicui/animated-list";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Gamepad2,
  Headphones,
  Users,
  ShieldCheck,
  Sparkles,
  Waves,
  LogIn,
  MessageCircle,
  Mic,
  Settings,
  Zap,
  Download,
} from "lucide-react";

const TEXT_ROW_A = ["OYUN", "-", "SOHBET", "-", "TAKILMA", "-", "KONUŞMA"];

const TEXT_ROW_B = ["OYUN", "-", "SOHBET", "-", "TAKILMA", "-", "KONUŞMA"];

const features = [
  {
    title: "Oyun Odaklı Ses",
    description:
      "Ultra düşük gecikmeli sesli kanallar ile takım arkadaşlarınızla aynı anda tepki verin.",
    icon: Headphones,
  },
  {
    title: "Birlikte Takılın",
    description:
      "Oyun, sohbet ve topluluk etkinlikleri için özelleştirilebilir odalar oluşturun.",
    icon: Gamepad2,
  },
  {
    title: "Güvenli Topluluk",
    description:
      "Gelişmiş moderasyon araçları ve uçtan uca güvenlik ile topluluğunuzu koruyun.",
    icon: ShieldCheck,
  },
];

const LandingPage = ({ onLogin, onRegister }) => {
  return (
    <div className="min-h-screen w-full bg-[#030712] text-white">
      <GridBeams
        className="min-h-screen"
        gridSize={48}
        gridColor="rgba(94, 234, 212, 0.18)"
        rayCount={20}
        rayOpacity={0.45}
        raySpeed={1.3}
        rayLength="60vh"
        gridFadeStart={10}
        gridFadeEnd={85}
        backgroundColor="#030712"
      >
        <div className="relative flex min-h-screen flex-col">
          <header className="relative z-20 flex items-center justify-between px-6 py-8 md:px-12">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                <Waves className="h-6 w-6 text-cyan-300" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/40">
                  Türkiye'nin Sesli Topluluğu
                </p>
                <h1 className="text-2xl font-bold tracking-tight text-white">Fluxy</h1>
              </div>
            </div>

            <div className="hidden items-center gap-4 lg:flex">
              <button className="text-sm font-medium text-white/70 transition-colors hover:text-white">
                Özellikler
              </button>
              <button className="text-sm font-medium text-white/70 transition-colors hover:text-white">
                Topluluk
              </button>
              <button className="text-sm font-medium text-white/70 transition-colors hover:text-white">
                Destek
              </button>
            </div>

            <div className="flex items-center gap-3">
              <InteractiveHoverButton
                type="button"
                onClick={() => onLogin?.()}
                className="border-transparent bg-cyan-500/80 text-sm font-semibold text-white hover:bg-cyan-400/80"
                icon={LogIn}
              >
                Giriş Yap
              </InteractiveHoverButton>
              <InteractiveHoverButton
                type="button"
                onClick={() => onRegister?.()}
                className="border-transparent bg-cyan-500/80 text-sm font-semibold text-white hover:bg-cyan-400/80"
                icon={Sparkles}
              >
                Ücretsiz Katıl
              </InteractiveHoverButton>
            </div>
          </header>

          <main className="relative z-20 flex-1 px-6 pb-16 md:px-12">
            <section className="mx-auto mt-10 max-w-4xl text-center md:mt-16">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.3em] text-white/60">
                <Sparkles className="h-4 w-4 text-cyan-300" />
                Beta Aşamasında
              </span>
              <h2 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
                Oyuncular için tasarlanmış yeni nesil sesli topluluk deneyimi
              </h2>
              <p className="mt-6 text-lg text-white/70 md:text-xl">
                Fluxy, gerçek zamanlı sesli iletişim, moderasyon araçları ve topluluk yönetimini bir araya getirerek arkadaşlarınla buluşacağın yepyeni bir alan sağlar.
              </p>

              <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <InteractiveHoverButton
                  type="button"
                  onClick={() => onRegister?.()}
                  className="w-full justify-center border-transparent bg-cyan-500/80 px-8 py-3 text-base font-semibold text-white hover:bg-cyan-400/80 sm:w-auto"
                  icon={Sparkles}
                >
                  Hemen Başla
                </InteractiveHoverButton>
                <InteractiveHoverButton
                  type="button"
                  onClick={() => alert('İndirme bağlantısı yakında eklenecek!')}
                  className="w-full justify-center border-transparent bg-cyan-500/80 px-8 py-3 text-base font-semibold text-white hover:bg-cyan-400/80 sm:w-auto"
                  icon={Download}
                  showArrow={false}
                >
                  Şimdi İndir
                </InteractiveHoverButton>
              </div>
            </section>

            <section className="relative mt-24 w-full">
              <div className="relative flex w-full flex-col items-center justify-center overflow-hidden py-8">
                <ScrollVelocityContainer className="w-full">
                  <ScrollVelocityRow baseVelocity={20} direction={1} className="py-4">
                    {TEXT_ROW_A.map((text, idx) => (
                      <span
                        key={idx}
                        className="mx-4 inline-block text-7xl font-black text-white"
                      >
                        {text}
                      </span>
                    ))}
                  </ScrollVelocityRow>
                  <ScrollVelocityRow baseVelocity={20} direction={-1} className="py-4">
                    {TEXT_ROW_B.map((text, idx) => (
                      <span
                        key={idx}
                        className="mx-4 inline-block text-7xl font-black text-white"
                      >
                        {text}
                      </span>
                    ))}
                  </ScrollVelocityRow>
                </ScrollVelocityContainer>

                <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-[#030712]"></div>
                <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-[#030712]"></div>
              </div>
            </section>

            <section className="mt-20">
              <div className="max-w-6xl mx-auto">
                <div className="grid gap-8 md:grid-cols-3">
                  {features.map(({ title, description, icon: Icon }) => (
                    <div
                      key={title}
                      className="relative h-[400px] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 shadow-2xl"
                    >
                      <ShineBorder
                        shineColor={["#60a5fa", "#a78bfa", "#34d399", "#f472b6"]}
                        borderWidth={2}
                        duration={12}
                        className="rounded-2xl"
                      />
                      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center space-y-6">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-white/10">
                          <Icon className="h-10 w-10 text-blue-400" />
                        </div>
                        <div className="space-y-3">
                          <h3 className="text-2xl font-bold text-white tracking-tight">
                            {title}
                          </h3>
                          <p className="text-slate-300 leading-relaxed max-w-xs">
                            {description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            <section className="mt-24">
              <div className="max-w-2xl mx-auto">
                <Card className="bg-white/5 border-white/10 backdrop-blur">
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-2xl font-semibold text-white md:text-3xl">
                      Neler Yaşanıyor?
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <AnimatedList delay={2000} className="max-w-md mx-auto">
                      <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20">
                          <Zap className="h-4 w-4 text-red-400" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-white">Zeynep yeni sunucu oluşturdu: "Minecraft Dünyası"</p>
                          <p className="text-xs text-white/60">15 dakika önce</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500/20">
                          <Zap className="h-4 w-4 text-yellow-400" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-white">Can yeni sunucu oluşturdu: "League of Legends"</p>
                          <p className="text-xs text-white/60">12 dakika önce</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20">
                          <Zap className="h-4 w-4 text-purple-400" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-white">Ayşe yeni sunucu oluşturdu: "Valorant Ligi"</p>
                          <p className="text-xs text-white/60">8 dakika önce</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20">
                          <Zap className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-white">Mehmet yeni sunucu oluşturdu: "Bizim Ekip"</p>
                          <p className="text-xs text-white/60">5 dakika önce</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
                          <Zap className="h-4 w-4 text-green-400" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-white">Ahmet yeni sunucu oluşturdu: "CS:GO Turnuvası"</p>
                          <p className="text-xs text-white/60">2 dakika önce</p>
                        </div>
                      </div>
                    </AnimatedList>
                  </CardContent>
                </Card>
              </div>
            </section>
          </main>

          <footer className="relative z-20 mt-24">
            <div className="relative overflow-hidden bg-gradient-to-t from-slate-900/80 to-slate-800/60 backdrop-blur-xl">
              <div className="relative z-10 px-6 py-12 md:px-12">
                <div className="max-w-6xl mx-auto">
                  <div className="grid gap-8 md:grid-cols-4">
                    {/* Brand Section */}
                    <div className="md:col-span-2 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
                          <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white">Fluxy</h3>
                      </div>
                      <p className="text-slate-300 leading-relaxed max-w-md">
                        Modern sesli sohbet platformu. Topluluklarını büyüt, arkadaşlarınla bağ kur.
                      </p>
                    </div>

                    {/* Links Section */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
                        Platform
                      </h4>
                      <div className="space-y-2">
                        <button className="block text-sm text-slate-300 hover:text-white transition-colors">
                          Özellikler
                        </button>
                        <button className="block text-sm text-slate-300 hover:text-white transition-colors">
                          Güvenlik
                        </button>
                        <button className="block text-sm text-slate-300 hover:text-white transition-colors">
                          API
                        </button>
                        <button className="block text-sm text-slate-300 hover:text-white transition-colors">
                          Durum
                        </button>
                      </div>
                    </div>

                    {/* Company Section */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
                        Şirket
                      </h4>
                      <div className="space-y-2">
                        <button className="block text-sm text-slate-300 hover:text-white transition-colors">
                          Hakkımızda
                        </button>
                        <button className="block text-sm text-slate-300 hover:text-white transition-colors">
                          Blog
                        </button>
                        <button className="block text-sm text-slate-300 hover:text-white transition-colors">
                          Kariyer
                        </button>
                        <button className="block text-sm text-slate-300 hover:text-white transition-colors">
                          İletişim
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Section */}
                  <div className="mt-12 pt-8 border-t border-white">
                    <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                      <p className="text-sm text-slate-400">
                        © {new Date().getFullYear()} Fluxy. Tüm hakları saklıdır.
                      </p>
                      <div className="flex items-center gap-6">
                        <button className="text-xs uppercase tracking-[0.25em] text-slate-400 hover:text-white transition-colors">
                          Gizlilik
                        </button>
                        <button className="text-xs uppercase tracking-[0.25em] text-slate-400 hover:text-white transition-colors">
                          Şartlar
                        </button>
                        <button className="text-xs uppercase tracking-[0.25em] text-slate-400 hover:text-white transition-colors">
                          Destek
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </footer>

          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-[#030712]" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#030712]" />
        </div>
      </GridBeams>
    </div>
  );
};

export default LandingPage;
