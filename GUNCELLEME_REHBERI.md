# 🔄 Fluxy Güncelleme Rehberi

## 📋 Kod Değişikliği Sonrası Yapılacaklar

### **1️⃣ Değişiklikleri GitHub'a Push Edin**

```bash
# Değişiklikleri kaydedin
git add .
git commit -m "Açıklama: Ne değişti?"

# GitHub'a gönderin
git push origin main
```

---

### **2️⃣ Version Numarasını Artırın**

**Dosya**: `frontend/package.json`

```json
{
  "name": "fluxy-frontend",
  "version": "0.1.1",  // 0.1.0 → 0.1.1 (artırın)
  ...
}
```

**Version Kuralları:**
- **Küçük düzeltme**: `0.1.0` → `0.1.1`
- **Yeni özellik**: `0.1.0` → `0.2.0`
- **Büyük değişiklik**: `0.1.0` → `1.0.0`

---

### **3️⃣ Git Tag Oluşturun**

```bash
# Tag oluşturun (version ile aynı olmalı)
git tag v0.1.1

# Tag'i GitHub'a gönderin
git push origin v0.1.1
```

---

### **4️⃣ Electron Build + GitHub Publish**

**PowerShell'i Administrator olarak açın:**

```powershell
# Frontend klasörüne gidin
cd "c:\Users\FCK\Downloads\yerli milli projem\frontend"

# GitHub Token'ı ayarlayın
$env:GH_TOKEN="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"

# Build + Publish
npm run dist:win
```

**Bu komut:**
- ✅ React build yapar
- ✅ Electron `.exe` dosyası oluşturur
- ✅ `latest.yml` dosyası oluşturur
- ✅ GitHub Releases'e otomatik yükler

---

### **5️⃣ GitHub Release'i Kontrol Edin**

1. https://github.com/feritcemkahraman/yerli-milli-projem/releases
2. Yeni release'in oluştuğunu görün: `v0.1.1`
3. Dosyaları kontrol edin:
   - ✅ `Fluxy-Setup-0.1.1.exe`
   - ✅ `Fluxy-Setup-0.1.1.exe.blockmap`
   - ✅ `latest.yml`

---

## 🎯 NE OLACAK?

### **Kullanıcı Tarafında:**

1. **Kullanıcı uygulamayı açar**
2. **Otomatik güncelleme kontrolü** (5 saniye içinde)
3. **Bildirim gösterir**:
   ```
   📢 Yeni güncelleme mevcut!
   Fluxy v0.1.1 hazır
   [İndir ve Yeniden Başlat]
   ```
4. **Kullanıcı tıklar** → Güncelleme indirilir
5. **Uygulama yeniden başlar** → Yeni sürüm açılır

---

## 📊 ÖZET TABLO

| Adım | Komut | Açıklama |
|------|-------|----------|
| 1 | `git push origin main` | Kodu GitHub'a gönder |
| 2 | `package.json` → version artır | `0.1.0` → `0.1.1` |
| 3 | `git tag v0.1.1 && git push origin v0.1.1` | Tag oluştur |
| 4 | `npm run dist:win` | Build + Publish |
| 5 | GitHub Releases kontrol | Yüklendiğini doğrula |

---

## ⚠️ ÖNEMLİ NOTLAR

### **Her Güncelleme İçin:**
- ✅ Version numarasını **mutlaka** artırın
- ✅ Git tag oluşturun
- ✅ PowerShell'i **Administrator** olarak çalıştırın
- ✅ GitHub Token'ı her seferinde ayarlayın

### **Kullanıcılar:**
- ✅ İlk kurulum: Manuel indirme (SmartScreen uyarısı)
- ✅ Sonraki güncellemeler: Otomatik (uyarı yok)
- ✅ Güncelleme süresi: ~30 saniye

---

## 🚀 HIZLI KOMUTLAR

### **Tek Seferde Tüm İşlemler:**

```bash
# 1. Version artırın (manuel: package.json)
# 2. Sonra bu komutları çalıştırın:

git add .
git commit -m "v0.1.1 - Yeni özellikler"
git tag v0.1.1
git push origin main --tags

cd frontend
$env:GH_TOKEN="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"
npm run dist:win
```

---

## 🎉 BAŞARILI GÜNCELLEME KONTROLÜ

### **Kontrol Listesi:**
- [ ] GitHub'da yeni release var mı?
- [ ] `latest.yml` dosyası var mı?
- [ ] `.exe` dosyası doğru boyutta mı? (~120 MB)
- [ ] Download linki çalışıyor mu?

### **Test:**
1. Eski sürümü kurun
2. Uygulamayı açın
3. 5-10 saniye bekleyin
4. Güncelleme bildirimi geldi mi?

---

## 📞 SORUN GİDERME

### **Build Hatası:**
```powershell
# Node modules'ı temizle
Remove-Item -Recurse -Force node_modules
npm install
npm run dist:win
```

### **GitHub 404 Hatası:**
- Token'ın yetkilerini kontrol edin (repo: full)
- Token'ı yenileyin: https://github.com/settings/tokens

### **Auto-Update Çalışmıyor:**
- `latest.yml` dosyası GitHub'da var mı?
- Version numarası artırıldı mı?
- Uygulama production mode'da mı? (dev mode'da çalışmaz)

---

## 🎯 SONUÇ

**Her kod değişikliğinde:**
1. Push → GitHub
2. Version artır → `package.json`
3. Tag oluştur → `git tag v0.1.x`
4. Build + Publish → `npm run dist:win`
5. Kullanıcılar otomatik güncelleme alır! 🎉

**Sistem tamamen otomatik! Sadece bu adımları takip edin!** 🚀
