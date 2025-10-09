import React from 'react';
import { Download, CheckCircle2, Users, MessageSquare, Sparkles } from 'lucide-react';
import { InteractiveHoverButton } from '@/registry/magicui/interactive-hover-button';
import { GridBeams } from '@/registry/magicui/grid-beams';

/**
 * RegistrationSuccess Component
 * Shown after successful registration from landing page
 */
export default function RegistrationSuccess({ email }) {
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
      
      <div className="w-full max-w-2xl relative z-10">
        <div className="bg-black/40 backdrop-blur-xl rounded-2xl p-12 border border-white/10 shadow-2xl text-center">
          {/* Success Icon */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 bg-green-500/30 rounded-full blur-3xl animate-pulse"></div>
            </div>
            <div className="relative flex items-center justify-center">
              <CheckCircle2 className="w-24 h-24 text-green-400 drop-shadow-[0_0_25px_rgba(74,222,128,0.7)]" />
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <img src="fluxy.png" alt="Fluxy" className="h-12 w-12" />
              <h1 className="text-3xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-500">
                FLUXY
              </h1>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">
              Hesabın Başarıyla Oluşturuldu! 🎉
            </h2>
            <p className="text-gray-400 text-lg">
              Hoş geldin! Artık Fluxy topluluğunun bir parçasısın.
            </p>
            {email && (
              <p className="text-cyan-400 text-sm mt-2">
                {email}
              </p>
            )}
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-cyan-500/50 transition-all">
              <Users className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
              <h3 className="text-white font-semibold mb-2">Topluluk Oluştur</h3>
              <p className="text-gray-400 text-sm">
                Kendi sunucunu kur ve arkadaşlarınla buluş
              </p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-purple-500/50 transition-all">
              <MessageSquare className="w-10 h-10 text-purple-400 mx-auto mb-3" />
              <h3 className="text-white font-semibold mb-2">Sohbet Et</h3>
              <p className="text-gray-400 text-sm">
                Sesli ve yazılı kanallarla etkileşimde kalın
              </p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:border-green-500/50 transition-all">
              <Sparkles className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <h3 className="text-white font-semibold mb-2">Keşfet</h3>
              <p className="text-gray-400 text-sm">
                Binlerce topluluğa katıl ve yeni insanlarla tanış
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl p-6 border border-cyan-500/30 mb-8">
            <h3 className="text-xl font-bold text-white mb-3">Sırada Ne Var?</h3>
            <ol className="text-left space-y-3 text-gray-300">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-bold">1</span>
                <span>Fluxy masaüstü uygulamasını indir</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-bold">2</span>
                <span>Hesabınla giriş yap ve topluluğunu oluştur</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-white text-sm font-bold">3</span>
                <span>Arkadaşlarını davet et veya mevcut sunuculara katıl</span>
              </li>
            </ol>
          </div>

          {/* Download Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <InteractiveHoverButton
              as="a"
              href="https://github.com/feritcemkahraman/fluxy/releases/latest/download/Fluxy-Setup-0.8.4.exe"
              download="Fluxy-Setup.exe"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto justify-center border-transparent bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 px-10 py-4 text-lg font-bold text-white shadow-lg shadow-cyan-500/50 transition-all hover:scale-105"
            >
              <Download className="w-6 h-6 mr-2" />
              Şimdi İndir ve Başla
            </InteractiveHoverButton>
          </div>

          <p className="text-gray-500 text-sm mt-6">
            Windows 10/11 • 64-bit • Ücretsiz
          </p>
        </div>
      </div>
    </div>
  );
}

