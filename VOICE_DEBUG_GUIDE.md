# 🔊 Ses Kanalı Debug Rehberi

## 🎯 Ses Kanalı Sorunlarını Tespit Etme

### 1. **Browser Console'u Açın**
- `F12` tuşuna basın
- `Console` sekmesine geçin
- Ses kanalına katılmaya çalışın

### 2. **Beklenen Log Mesajları**

#### ✅ **Başarılı Bağlantı Log'ları:**
```
🔧 Setting up VoiceChat socket listeners...
✅ VoiceChat socket listeners set up
🎤 Mikrofon erişimi isteniyor...
✅ Mikrofon erişimi başarılı
👤 User joined voice: [USER_ID] in channel: [CHANNEL_ID]
🤝 Creating peer connection as initiator for user: [USER_ID]
📡 Sending signal to user: [USER_ID]
📡 Received signal from user: [USER_ID] in channel: [CHANNEL_ID]
🤝 Creating peer connection as receiver for user: [USER_ID]
📤 Sending signal to peer: [USER_ID]
✅ Peer connected to user: [USER_ID]
🎧 Received remote stream from user: [USER_ID]
🔊 Creating audio element for user: [USER_ID]
```

#### ❌ **Hata Durumları ve Çözümleri:**

**1. Mikrofon İzin Hatası:**
```
❌ Mikrofon erişim hatası: NotAllowedError
```
**Çözüm:** Tarayıcı ayarlarından mikrofon iznini etkinleştirin.

**2. WebSocket Bağlantı Hatası:**
```
❌ Socket not authenticated or connected
```
**Çözüm:** Backend'in çalıştığından ve ngrok URL'inin güncel olduğundan emin olun.

**3. Peer Bağlantı Hatası:**
```
❌ No local stream available for peer connection
```
**Çözüm:** Mikrofon izni verilmediği için peer bağlantısı kurulamıyor.

**4. Signal Hatası:**
```
❌ Channel mismatch: current=null, joined=[CHANNEL_ID]
```
**Çözüm:** Ses kanalına katılım işlemi tamamlanmadan signal gelmiş.

### 3. **Manuel Test Adımları**

#### **Test 1: Mikrofon İzni**
1. Ses kanalına tıklayın
2. Console'da `🎤 Mikrofon erişimi isteniyor...` mesajını arayın
3. Tarayıcı mikrofon izni isterse **İzin Ver**'e tıklayın
4. `✅ Mikrofon erişimi başarılı` mesajını görmelisiniz

#### **Test 2: WebSocket Bağlantısı**
1. Console'da `Socket.IO connected to ngrok backend` mesajını arayın
2. `Socket authentication successful` mesajını kontrol edin
3. Yoksa backend'i yeniden başlatın ve ngrok URL'ini güncelleyin

#### **Test 3: Peer Bağlantısı**
1. İki farklı tarayıcı/sekme açın
2. Aynı ses kanalına katılın
3. Console'da her iki tarafta da şu mesajları arayın:
   - `👤 User joined voice`
   - `🤝 Creating peer connection`
   - `✅ Peer connected to user`

#### **Test 4: Ses Akışı**
1. Peer bağlantısı kurulduktan sonra:
2. `🎧 Received remote stream from user` mesajını arayın
3. `🔊 Creating audio element for user` mesajını kontrol edin
4. Konuşun ve karşı tarafta ses gelip gelmediğini test edin

### 4. **Yaygın Sorunlar ve Çözümler**

#### **Sorun 1: Ses Gitmiyor**
- Console'da `📡 Sending signal to user` mesajları var mı?
- Mikrofon izni verildi mi?
- Local stream oluşturuldu mu?

#### **Sorun 2: Ses Gelmiyor**
- Console'da `🎧 Received remote stream` mesajı var mı?
- Audio element oluşturuldu mu?
- Tarayıcı autoplay policy'si engelliyor olabilir

#### **Sorun 3: Peer Bağlantısı Kurulmuyor**
- WebSocket bağlantısı aktif mi?
- Signal'lar karşılıklı gönderiliyor mu?
- Firewall/NAT sorunu olabilir

### 5. **Backend Debug**

Backend console'unda şu mesajları arayın:
```
🔊 JOIN: [USERNAME] | Channel: [CHANNEL_ID] | Users: [USER_LIST]
📤 Optimized voice sync to server_[SERVER_ID]: [USER_LIST]
```

### 6. **Acil Çözümler**

#### **Hızlı Reset:**
1. Tarayıcı sekmesini yenileyin
2. Backend'i yeniden başlatın
3. Mikrofon izinlerini sıfırlayın (Site Settings > Microphone)

#### **Tarayıcı Uyumluluğu:**
- Chrome/Edge: En iyi uyumluluk
- Firefox: İyi uyumluluk
- Safari: Sınırlı uyumluluk

### 7. **Destek İçin**

Sorun devam ederse, console log'larının screenshot'ını alın ve şu bilgileri paylaşın:
- Tarayıcı ve versiyonu
- İşletim sistemi
- Hata mesajları
- Network durumu (Wi-Fi/Ethernet)

---

**Not:** Bu debug rehberi ses kanalı sorunlarını hızlıca tespit etmenize yardımcı olacaktır. Her adımı sırasıyla takip edin.
