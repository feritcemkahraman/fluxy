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

const TEXT_ROW_A = ["-", "OYUN", "-", "SOHBET", "-", "TAKILMA", "-", "KONUŞMA"];

const TEXT_ROW_B = ["-", "OYUN", "-", "SOHBET", "-", "TAKILMA", "-", "KONUŞMA"];

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
    <div className="min-h-screen w-full bg-[#030712] text-white" style={{overflowX: 'hidden', maxWidth: '100vw'}}>
      <GridBeams
        className=""
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
              <img src="/fluxy.png" alt="Fluxy Logo" className="h-10 w-10" />
              <div className="relative">
                <h1 className="text-4xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-500 animate-pulse drop-shadow-[0_0_15px_rgba(94,234,212,0.5)]">
                  FLUXY
                </h1>
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
                onClick={() => onRegister?.()}
                className="border-transparent bg-cyan-500/80 text-sm font-semibold text-white hover:bg-cyan-400/80"
              >
                Ücretsiz Katıl
              </InteractiveHoverButton>
            </div>
          </header>

          <main className="relative z-20 flex-1 px-6 pb-16 md:px-12">
            <section className="mx-auto mt-10 max-w-4xl text-center md:mt-16">
              <div className="flex items-center justify-center gap-4">
                <img src="/fluxy.png" alt="Fluxy" className="h-16 w-16" />
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.3em] text-white/60">
                  <Sparkles className="h-4 w-4 text-cyan-300" />
                  Beta Aşamasında
                </span>
              </div>
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
                >
                  Ücretsiz Katıl
                </InteractiveHoverButton>
                <InteractiveHoverButton
                  as="a"
                  href="https://github.com/feritcemkahraman/fluxy/releases/latest/download/Fluxy-Setup-0.2.9.exe"
                  download="Fluxy-Setup.exe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full justify-center border-transparent bg-cyan-500/80 px-8 py-3 text-base font-semibold text-white hover:bg-cyan-400/80 sm:w-auto"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Şimdi İndir
                </InteractiveHoverButton>
              </div>
            </section>

            <section className="relative mt-24 w-full">
              <div className="relative flex w-full flex-col items-center justify-center overflow-hidden py-8">
                <ScrollVelocityContainer className="w-full text-4xl font-bold md:text-7xl">
                  <ScrollVelocityRow baseVelocity={8} direction={1} className="py-4">
                    {TEXT_ROW_A.map((text, idx) => (
                      <span key={idx} className="mx-8 text-white">
                        {text}
                      </span>
                    ))}
                  </ScrollVelocityRow>
                  <ScrollVelocityRow baseVelocity={8} direction={-1} className="py-4">
                    {TEXT_ROW_B.map((text, idx) => (
                      <span key={idx} className="mx-8 text-white">
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

            {/* Live Mockup Section */}
            <section className="relative mt-32 w-full">
              <div className="mx-auto max-w-7xl px-6 md:px-12">
                <div className="text-center mb-16">
                  <h2 className="text-4xl font-bold text-white mb-4">
                    Gerçek Zamanlı Deneyim
                  </h2>
                  <p className="text-lg text-white/70">
                    Arkadaşlarınla anında bağlan, sesli sohbet et, ekran paylaş
                  </p>
                </div>

                {/* Mockup Container */}
                <div className="relative">
                  {/* Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 blur-3xl"></div>
                  
                  {/* Main Mockup */}
                  <div className="relative bg-[#1a1d29] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                    {/* Window Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#0f1117] border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-white/40 font-mono">Fluxy Desktop App</div>
                      </div>
                      <div className="w-16"></div>
                    </div>

                    {/* App Content */}
                    <div className="flex h-[600px]">
                      {/* Sidebar */}
                      <div className="w-20 bg-[#0f1117] border-r border-white/5 flex flex-col items-center py-4 gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-cyan-500/50">
                          F
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-purple-500"></div>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-blue-500"></div>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-green-500"></div>
                        </div>
                        <div className="w-12 h-1 bg-white/10 rounded-full my-2"></div>
                        <div className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 transition-all cursor-pointer flex items-center justify-center text-white/40 text-2xl">
                          +
                        </div>
                      </div>

                      {/* Channels Sidebar */}
                      <div className="w-60 bg-[#15171f] border-r border-white/5 flex flex-col">
                        <div className="px-4 py-3 border-b border-white/5">
                          <h3 className="text-white font-semibold">Oyuncu Topluluğu</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                          <div className="mb-4">
                            <div className="text-xs text-white/40 uppercase font-semibold px-2 mb-2">Metin Kanalları</div>
                            <div className="space-y-1">
                              <div className="px-2 py-1.5 rounded text-white/60 hover:bg-white/5 cursor-pointer flex items-center gap-2">
                                <MessageCircle className="w-4 h-4" />
                                <span className="text-sm">genel-sohbet</span>
                              </div>
                              <div className="px-2 py-1.5 rounded text-white/60 hover:bg-white/5 cursor-pointer flex items-center gap-2">
                                <MessageCircle className="w-4 h-4" />
                                <span className="text-sm">duyurular</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-white/40 uppercase font-semibold px-2 mb-2">Sesli Kanallar</div>
                            <div className="space-y-1">
                              <div className="px-2 py-1.5 rounded bg-white/10 text-white cursor-pointer flex items-center gap-2">
                                <Mic className="w-4 h-4 text-cyan-400" />
                                <span className="text-sm">Genel</span>
                                <div className="ml-auto flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                  <span className="text-xs text-white/60">3</span>
                                </div>
                              </div>
                              <div className="px-2 py-1.5 rounded text-white/60 hover:bg-white/5 cursor-pointer flex items-center gap-2">
                                <Mic className="w-4 h-4" />
                                <span className="text-sm">Oyun Odası</span>
                              </div>
                              <div className="px-2 py-1.5 rounded text-white/60 hover:bg-white/5 cursor-pointer flex items-center gap-2">
                                <Mic className="w-4 h-4" />
                                <span className="text-sm">AFK</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* User Panel */}
                        <div className="px-2 py-3 bg-[#0f1117] border-t border-white/5 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600"></div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white font-medium truncate">Emre</div>
                            <div className="text-xs text-white/40">#4521</div>
                          </div>
                          <Settings className="w-4 h-4 text-white/40 hover:text-white cursor-pointer" />
                        </div>
                      </div>

                      {/* Main Chat Area */}
                      <div className="flex-1 flex flex-col bg-[#1a1d29]">
                        {/* Chat Header */}
                        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                          <MessageCircle className="w-5 h-5 text-white/60" />
                          <h3 className="text-white font-semibold">genel-sohbet</h3>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                          <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex-shrink-0"></div>
                            <div>
                              <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-white font-semibold">Ahmet</span>
                                <span className="text-xs text-white/40">bugün 14:23</span>
                              </div>
                              <p className="text-white/80">Selam! Kim Valorant oynamak ister?</p>
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex-shrink-0"></div>
                            <div>
                              <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-white font-semibold">Zeynep</span>
                                <span className="text-xs text-white/40">bugün 14:24</span>
                              </div>
                              <p className="text-white/80">Ben varım! 🎮</p>
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex-shrink-0"></div>
                            <div>
                              <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-white font-semibold">Emre</span>
                                <span className="text-xs text-white/40">bugün 14:25</span>
                              </div>
                              <p className="text-white/80">Sesli kanala geçelim mi?</p>
                            </div>
                          </div>

                          {/* Typing Indicator */}
                          <div className="flex gap-3 opacity-60">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex-shrink-0"></div>
                            <div>
                              <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-white font-semibold">Can</span>
                              </div>
                              <div className="flex gap-1">
                                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Message Input */}
                        <div className="p-4 border-t border-white/5">
                          <div className="bg-[#0f1117] rounded-lg px-4 py-3 flex items-center gap-2">
                            <input 
                              type="text" 
                              placeholder="genel-sohbet kanalına mesaj gönder"
                              className="flex-1 bg-transparent text-white/60 placeholder-white/40 outline-none text-sm"
                              disabled
                            />
                            <Sparkles className="w-5 h-5 text-white/40" />
                          </div>
                        </div>
                      </div>

                      {/* Right Sidebar - Members */}
                      <div className="w-60 bg-[#15171f] border-l border-white/5 p-4">
                        <div className="text-xs text-white/40 uppercase font-semibold mb-3">Çevrimiçi — 4</div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer">
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600"></div>
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#15171f]"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white truncate">Emre</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer">
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600"></div>
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#15171f]"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white truncate">Ahmet</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer">
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600"></div>
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#15171f]"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white truncate">Zeynep</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer">
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-green-600"></div>
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-yellow-500 rounded-full border-2 border-[#15171f]"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white truncate">Can</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floating Elements */}
                  <div className="absolute -top-10 -left-10 w-20 h-20 bg-cyan-500/30 rounded-full blur-2xl animate-pulse"></div>
                  <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-500/30 rounded-full blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
                </div>
              </div>
            </section>

            {/* Screen Share Mockup Section */}
            <section className="relative mt-32 w-full">
              <div className="mx-auto max-w-7xl px-6 md:px-12">
                <div className="text-center mb-16">
                  <h2 className="text-4xl font-bold text-white mb-4">
                    Profesyonel Ekran Paylaşımı
                  </h2>
                  <p className="text-lg text-white/70">
                    1080p Full HD kalitesinde, 144Hz akıcılığında ekran paylaşımı
                  </p>
                </div>

                {/* Screen Share Mockup Container */}
                <div className="relative">
                  {/* Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-cyan-500/20 to-blue-500/20 blur-3xl"></div>
                  
                  {/* Main Screen Share Window */}
                  <div className="relative bg-[#1a1d29] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                    {/* Window Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#0f1117] border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/40 rounded-full">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-green-400 font-semibold">CANLI YAYIN</span>
                        </div>
                        <div className="text-xs text-white/40 font-mono">Fluxy Screen Share</div>
                      </div>
                      <div className="w-16"></div>
                    </div>

                    {/* Screen Share Content */}
                    <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 p-8">
                      {/* Quality Badges */}
                      <div className="absolute top-4 right-4 flex gap-2 z-20">
                        <div className="px-3 py-1.5 bg-cyan-500/90 backdrop-blur-sm rounded-lg border border-cyan-400/50 shadow-lg shadow-cyan-500/50">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            <span className="text-white font-bold text-sm">1080p Full HD</span>
                          </div>
                        </div>
                        <div className="px-3 py-1.5 bg-green-500/90 backdrop-blur-sm rounded-lg border border-green-400/50 shadow-lg shadow-green-500/50">
                          <div className="flex items-center gap-2">
                            <Zap className="w-3 h-3 text-white" />
                            <span className="text-white font-bold text-sm">144Hz</span>
                          </div>
                        </div>
                      </div>

                      {/* Shared Screen Preview */}
                      <div className="relative aspect-video rounded-xl border border-white/10 overflow-hidden shadow-2xl">
                        {/* Fortnite Gameplay Screenshot */}
                        <img 
                          src="https://sm.pcmag.com/pcmag_au/review/f/fortnite-f/fortnite-for-pc_xj3t.jpg" 
                          alt="Fortnite Screen Share"
                          className="w-full h-full object-cover"
                        />

                        {/* Performance Overlay */}
                        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                          <div className="flex gap-3">
                            <div className="px-3 py-2 bg-black/60 backdrop-blur-sm rounded-lg border border-white/10">
                              <div className="text-xs text-white/60 mb-1">FPS</div>
                              <div className="text-lg font-bold text-green-400">144</div>
                            </div>
                            <div className="px-3 py-2 bg-black/60 backdrop-blur-sm rounded-lg border border-white/10">
                              <div className="text-xs text-white/60 mb-1">Kalite</div>
                              <div className="text-lg font-bold text-cyan-400">1080p</div>
                            </div>
                            <div className="px-3 py-2 bg-black/60 backdrop-blur-sm rounded-lg border border-white/10">
                              <div className="text-xs text-white/60 mb-1">Gecikme</div>
                              <div className="text-lg font-bold text-blue-400">12ms</div>
                            </div>
                          </div>
                          <div className="px-3 py-2 bg-black/60 backdrop-blur-sm rounded-lg border border-white/10">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-sm text-white font-medium">Emre ekranını paylaşıyor</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Viewers */}
                      <div className="mt-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex -space-x-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 border-2 border-[#1a1d29] flex items-center justify-center">
                              <Users className="w-5 h-5 text-white" />
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 border-2 border-[#1a1d29]"></div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 border-2 border-[#1a1d29]"></div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 border-2 border-[#1a1d29] flex items-center justify-center">
                              <span className="text-white text-xs font-bold">+5</span>
                            </div>
                          </div>
                          <div>
                            <div className="text-white font-semibold">8 kişi izliyor</div>
                            <div className="text-white/60 text-sm">Ultra düşük gecikme modu aktif</div>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex gap-2">
                          <button className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all">
                            <Settings className="w-5 h-5 text-white" />
                          </button>
                          <button className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg transition-all">
                            <span className="text-red-400 font-semibold">Paylaşımı Durdur</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Feature Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                    <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 backdrop-blur-sm rounded-xl p-6 border border-cyan-500/20">
                      <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-4">
                        <Zap className="w-6 h-6 text-cyan-400" />
                      </div>
                      <h3 className="text-white font-semibold text-lg mb-2">Ultra Hızlı</h3>
                      <p className="text-white/60 text-sm">144Hz desteği ile kristal netliğinde, gecikme olmadan ekran paylaşımı</p>
                    </div>

                    <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-sm rounded-xl p-6 border border-green-500/20">
                      <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-4">
                        <Sparkles className="w-6 h-6 text-green-400" />
                      </div>
                      <h3 className="text-white font-semibold text-lg mb-2">Full HD Kalite</h3>
                      <p className="text-white/60 text-sm">1920x1080 çözünürlükte, her detayı net görebileceğiniz kalitede yayın</p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-sm rounded-xl p-6 border border-blue-500/20">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                        <Users className="w-6 h-6 text-blue-400" />
                      </div>
                      <h3 className="text-white font-semibold text-lg mb-2">Çoklu İzleyici</h3>
                      <p className="text-white/60 text-sm">Sınırsız sayıda kişi aynı anda ekranınızı izleyebilir</p>
                    </div>
                  </div>

                  {/* Floating Elements */}
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-green-500/30 rounded-full blur-2xl animate-pulse"></div>
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-cyan-500/30 rounded-full blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
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
                        <img src="/fluxy.png" alt="Fluxy" className="h-10 w-10" />
                        <h1 className="text-3xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-500 animate-pulse drop-shadow-[0_0_15px_rgba(94,234,212,0.5)]">
                          FLUXY
                        </h1>
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
