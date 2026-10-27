# Gemini için modelleme komutu: Ana savaş aracı v2

**Nasıl kullanılır:** Aşağıdaki "KOMUT" bölümünün tamamını Gemini'ye yapıştır. Mesaja `blender/car.py` dosyasının içeriğini de ekle; Gemini mevcut kuralları oradan görecek. Gemini bir Python betiği verecek. Onu `blender/car_v2.py` olarak kaydedip çalıştır:

```
blender -b -P blender/car_v2.py -- blender/cikti_v2
```

Çıkan `blender/cikti_v2/` klasöründeki PNG'lere bak. Beğenirsen bana "model hazır" de; GLB'leri oyuna ben bağlarım (`models/` klasörüne kopyalama, `tools/pack_models.py`, oyun içi test).

---

## KOMUT

Sen deneyimli bir Blender Python (bpy) teknik sanatçısısın. Tarayıcıda çalışan bir Three.js oyunu ("Death Race: Terminal Velocity") için ana oyuncu aracını yeniden modelleyen, **tek dosyalık, baştan sona kendi kendine çalışan** bir Blender betiği yazmanı istiyorum. Ekteki `car.py` mevcut sürüm. Onun sözleşmesini (aşağıdaki teknik kurallar) birebir koru, ama görünümü çok daha iyi yap.

### 1. Sanat yönü
- 1970'lerin Amerikan "muscle car" fastback silüeti: uzun kaput, kısa arka, alçak ve geniş duruş.
- Hapishane ölüm yarışı için kaynakla zırhlandırılmış hâli: kaba kaynak dikişli çelik plakalar, perçinler, pas ve kir tonları.
- Camlar yerine dar vizör yarıkları ve tel kafes. Kaputtan fırlayan süperşarj ve hava girişi. Yan egzoz boruları.
- Ön tarafta ağır koçbaşı ve mahmuzlar, arkada kalın çelik "mezar taşı" kalkan, tavanda roll-cage ve projektörler.
- Stil: düşük poligonlu, stilize ama zengin silüet. Arkadan takip kamerasıyla 60–150 km/sa hızda bile okunabilir olmalı. Keskin, okunaklı formlar; gereksiz mikro detay yok.
- **Tamamen özgün tasarım.** Gerçek marka, logo, plaka ya da filmdeki aracın birebir kopyası olmayacak.

### 2. Koordinat sistemi ve ölçüler (DEĞİŞTİRME)
- Blender'da Z yukarı, aracın **önü −Y**, arkası +Y. 1 birim = 1 metre. Dikkat: önü −Y'ye bakan araçta **−X aracın sağ yanıdır**; parça adları (`_l` = −X) tarihsel olarak böyle kaldı, adlara değil koordinatlara uy.
- GLB dışa aktarımı `export_yup=True` ile yapılacak. Oyunda +Z ileri olur; bu yüzden yön kuralına mutlaka uy.
- Gövde zarfı (tekerlekler hariç): X −1.00…+1.00, Y −2.30…+2.05, Z 0.40…1.45 içinde kalmalı. Oyunun çarpışma kutusu buna göre ayarlı.
- Tekerlek merkezleri sabit: (±1.00, −1.45, 0.38) ön, (±1.00, +1.45, 0.38) arka. Gövde/çamurluk tekerleklerin dönüşüne yer bırakmalı.
- Oyun şu noktalara kendi nesnelerini ekliyor; bu bölgeleri boş ve düz bırak:
  - Minigunlar: (±0.38, −0.42, 1.14) civarı
  - Roket kovanı: (0, +0.20, 1.66) civarı. Tavanın arka-ortası; roll-cage buna engel olmasın.
  - Egzoz alevleri: (±0.55, +2.40, 0.96)
  - Opsiyonel koçbaşı kiti: (0, −2.35, 0.93)

### 3. Nesne adları (DEĞİŞTİRME: oyun koda bu adlarla bağlı)
`car_body.glb` içinde tam olarak şu 6 nesne olacak; her biri **tek bir birleştirilmiş (joined) mesh nesnesi**:

| Nesne adı | İçerik | Oyundaki davranış |
|---|---|---|
| `chassis` | Ana gövde, kabin, kaput, çamurluklar, tamponlar, farlar, stoplar, egzozlar | Hiç kopmaz |
| `part_spikes` | Ön koçbaşı bıçakları ve mahmuzlar | Önden darbede kopar |
| `part_armor_l` | −X yanındaki kapı zırh plakası | −X yanından darbede kopar |
| `part_armor_r` | +X yanındaki kapı zırh plakası | +X yanından darbede kopar |
| `part_roof` | Tavan roll-cage ve projektör barı | Üstten darbede kopar |
| `part_tombstone` | Arka kalın çelik kalkan | Arkadan darbede kopar |

- Her `part_*` nesnesi gövdeye **görsel olarak bağlı** dursun (havada süzülmesin). Koptuğunda altındaki gövde yüzeyi boş ya da delik görünmesin; altına basit bir kapama yüzeyi koy.
- Kopan parçalar oyunda sınırlayıcı kutularına göre fizik gövdesi alır. Bu yüzden her parça kompakt olsun, tek parça ince uzun çubuklardan oluşmasın.

### 4. Malzemeler (oyun boyamayı malzeme adıyla yapıyor)
- Sadece Principled BSDF, **doku (texture) yok.** Renkler sRGB'den lineere çevrilerek verilsin (`car.py` içindeki `_lin` gibi).
- **`T_Govde`**: ana boya. Oyun bu malzemenin rengini garajdaki boya seçimine ve rakip renklerine göre değiştirir. Gövdenin geniş, görünür boyalı panellerinde kullan (kaput, yanlar, arka çamurluklar).
- **`GovdeKoyu`**: ikincil boya; oyun bunu ana rengin koyu tonu yapar. İç kenarlarda, alt panellerde kullan.
- **`Far`**: farlar ve projektörler, emissive. **`StopIsigi`**: stop lambaları, emissive kırmızı.
- Diğer malzemeleri serbestçe adlandırabilirsin (zırh, çelik, pas, cam, lastik, jant…). **Toplam en fazla 12 malzeme** olsun.

### 5. Tekerlek (`wheel.glb`)
- Tek nesne, adı `wheel`. Merkez orijinde, dönme ekseni **X ekseni**. Yarıçap 0.38, genişlik 0.30.
- Kalın arazi lastiği diş deseni, çelik jant, merkezde göbek ve cıvatalar. Her iki yanı da düzgün görünsün; oyun aynı modeli sol ve sağda kullanıyor.

### 6. Performans bütçesi
- `car_body.glb`: toplam **en fazla 12.000 üçgen**. `wheel.glb`: **en fazla 1.200 üçgen** (oyunda 5 araçta 20 tekerlek var).
- Tüm modifier'lar uygulanmış olsun; n-gon kalmasın (dışa aktarımda üçgenlesin).
- Gölgelendirme: flat ya da sert kenarlı (auto smooth ~30°) olabilir; tutarlı olsun.

### 7. Betik kuralları
- `blender -b -P car_v2.py -- <çıktı_klasörü>` ile arka planda çalışsın. Çıktı klasörünü `sys.argv` içinde `--` sonrasından alsın (car.py'deki gibi).
- `bpy.ops.wm.read_factory_settings(use_empty=True)` ile başlasın. İnternet, harici dosya ya da eklenti kullanmasın. Blender 4.1 ve üzeri ile çalışsın.
- Okunabilir olsun: yardımcı fonksiyonlar (ör. `box()`, `cyl()`, `bevel`, `join`, `mat`), bölümler Türkçe yorumlarla ayrılmış.
- Çıktılar:
  1. `car_body.glb`: 6 nesne, `export_apply=True, export_yup=True`, yalnızca bu 6 nesne seçili.
  2. `wheel.glb`: yalnızca `wheel`, orijinde.
  3. İnceleme renderları: `car_34.png`, `car_front.png`, `car_rear.png`, `car_side.png`, `car_top.png`. EEVEE, 1400×900, nötr gri zemin; 4 tekerlek doğru konumlarda; ayrıca parçaları belli olsun diye `car_exploded.png` (her `part_*` kendi yönünde 0.4 m dışarı kaydırılmış).
  4. `car.blend`
- Betiğin sonunda bir **doğrulama** bölümü olsun. Şunları yazdırsın ve kuralı bozan bir durum varsa `assert` ile hata versin:
  - 6 nesne adının birebir varlığı
  - `T_Govde`, `GovdeKoyu`, `Far`, `StopIsigi` malzemelerinin varlığı ve `T_Govde`'nin `chassis` üzerinde kullanılması
  - nesne başına ve toplam üçgen sayısı (bütçe aşılmasın)
  - gövde sınırlayıcı kutusunun Bölüm 2'deki zarf içinde olması
  - malzeme sayısının en fazla 12 olması

Önce kısa bir tasarım planı yaz (silüet, ana hacimler, her `part_*`'ın nerede duracağı). Ardından betiğin tamamını tek kod bloğunda ver.
