# Gemini görevi: Çarpışma ve sürüş fiziği elden geçirme

**Kullanıcı için:** bu dosyanın tamamını Gemini'ye yapıştır. Ekte şunları ver:
- `js/game.js` dosyasının tamamı
- `docs/DEVIR_NOTU.md`
- `docs/DR_API.md`

Gemini değişiklikleri **ayrı ayrı yama (eski kod → yeni kod) blokları** hâlinde versin. Sonra Claude'a "Gemini yamaları geldi" de; Claude inceleyip uygular ve test eder.

---

## KOMUT

Sen deneyimli bir oyun fiziği programcısısın (Three.js r158 + cannon-es, RaycastVehicle). "Death Race: Terminal Velocity" adlı tarayıcı tabanlı savaşlı araba yarışı oyununda **çarpışma ve sürüş hissini** düzelteceksin. Proje hakkında bilmen gerekenler ekteki `docs/DEVIR_NOTU.md` dosyasında. Oyunun tamamı `js/game.js` içinde (~9.500 satır, derleme adımı yok, düz script). Eklentiler `window.DR` arayüzüyle bağlanıyor (`docs/DR_API.md`). Bu arayüzü ve olay adlarını bozma.

### Kullanıcının şikâyetleri (öncelik sırasıyla)
1. **Çarpmalar çok abartılı.** Yan bariyere veya rakip araca çarpınca araç çok yükseğe zıplıyor ve takla atıyor. Araç ağır hissettirmeli (~1.750 kg'lık zırhlı muscle car). Normal bir çarpma aracı sarsmalı, yavaşlatmalı ve yön değiştirmeli; uçurmamalı. Takla yalnızca rampadan, patlamadan ya da çok yüksek hızda köşeden darbe alınca olmalı.
2. **Havada kendi kendine düzeliyor.** Takla atarken araç havadayken düzleşiyor, bu gerçek dışı görünüyor. Düzeltme yalnızca araç **yerdeyken ve neredeyse durmuşken** ters kaldıysa yapılmalı.
3. **Duvara veya araca sürtünce kalıyor.** Yan bariyere ya da araca yaslanınca direksiyon çevrilip gaza basılsa bile araç oraya yapışıp kalıyor. Gerçekte araç duvara sürtünerek, zorlanarak ve yavaşlayarak oradan sıyrılıp çıkabilmeli: kıvılcım, sürtünme sesi, hafif hasar, hız kaybı olmalı ama kilitlenme olmamalı.

### Koddaki ilgili yerler (satır numaraları yaklaşık, adlarıyla ara)
- **Fizik dünyası ve malzemeler** (~1400. satır): `world`, `world.defaultContactMaterial.friction = 0.35`, `groundMat`, `wheelMat`, `debrisMat`. Araç gövdesi `debrisMat` kullanıyor. Bariyerler ve duvarlar için ayrı bir malzeme ve **gövde–bariyer, gövde–gövde ContactMaterial'ı yok**. Gövde ile duvar arasında sürtünme düşük olmalı (~0.05–0.1, sıyrılabilsin), sekme (restitution) ~0 olmalı.
- **`createVehiclePhysics()`** (~2740): gövde kütlesi 1750, `chassisSize` (0.95, 0.4, 2.1), `angularDamping 0.88`, `linearDamping 0.04`, `wheelOptions` (`rollInfluence 0.02`, süspansiyon). Ağırlık merkezi çok yüksek olabilir; şekil `Vec3(0, 0.12, 0)` ofsetle eklenmiş. Ağırlık merkezini aşağı almak için şekli yukarı kaydır. Gerekirse eylemsizliği (inertia) artır, yuvarlanma momentini azalt.
- **`chassisBody.addEventListener('collide', ...)`** (~3860): oyuncu çarpışma hasarı.
- **AI tarafında aynısı** `cBody.addEventListener('collide', ...)` (~4510).
- **Yan darbe (shunt)** (~6790–6815): rakibe `applyImpulse(..., 500 yukarı, 18000 yan)`. Bu çok güçlü olabilir.
- **Rakibe uygulanan diğer ani hız değişimleri:**
  - `victimAI.chassisBody.velocity.y += 6.8` ve hemen ardından gelen `angularVelocity.set(...)` (~4640)
  - `angularVelocity.y += ±6 / ±5.5 / ±3.5` (~4849, ~6773, ~5058)
- **ESP** (~6295): `angularVelocity.y > 2.0` ise `*0.88`.
- **`updateRollOverRecovery(dt)`** (~6933): `up.y < -0.15` 1 sn sürerse aracı anında düzeltip 1.8 m yukarı ışınlıyor. **Yerde olup olmadığına bakmıyor; havada düzelme buradan geliyor.**
- **Bariyer gövdeleri:** "bariyer" ve `BARRIER_STEPS` geçen yerlerde birleşik statik gövdeler var (~1560–1660). Yolu çevreleyen beton bloklar. Bariyer kutularının üst kenarı aracın gövde kutusunu yukarı itip "rampa" etkisi yapıyor olabilir.
- **Debris ve dinamik bariyer bloklarının** (`dynBody`, ~1655) araçla etkileşimi.

### Yapılacaklar

**A. Ağırlık ve çarpışma tepkisi**
1. `chassisMat` adlı ayrı bir malzeme oluştur, araç gövdelerinde kullan. Bariyerler ve duvarlar için `wallMat`, kopan parçalar için `debrisMat` kalsın.
2. ContactMaterial'ları tanımla:
   - araç–duvar: sürtünme ~0.08, sekme 0
   - araç–araç: sürtünme ~0.15, sekme ~0.05
   - araç–zemin: gövde yere değerse sürtünme ~0.5
   - Değerleri sabit olarak dosyanın başında topla, Türkçe yorumla açıkla.
3. Ağırlık merkezini düşür: gövde şeklinin ofsetini yükselt ya da kütle dağılımını değiştir. Sürüş hissini bozma, tekerlek konumları aynı kalsın.
4. Darbe sonrası **dikey hız sınırı:** çarpışmadan sonraki birkaç karede gövdenin yukarı hızını sınırla (ör. ≤ 2.5 m/sn). Bu sınır rampa ve patlama kaynaklıysa uygulanmasın; bunun için bir `allowAirUntil` zamanı tut, rampa ve patlama kodu bunu ayarlasın.
5. **Yuvarlanma (roll/pitch) açısal hızı sınırı:** çarpışma anında X ve Z eksenlerindeki açısal hızı sınırla (ör. ≤ 2.5 rad/sn). Y eksenindeki dönüş (savrulma) serbest kalsın, ama o da makul olsun.
6. Script'teki yapay itmeleri (`velocity.y += 6.8`, `applyImpulse(..., 500, 18000)`, `angularVelocity.y += 6`) gözden geçir. Takedown hissini koru (rakip savrulsun, kontrolü kaybetsin), ama uçmasın. Bunları hız ve kütleyle orantılı yap.
7. Kütle hissi: hafif bir rakip (`ai.cfg` içindeki farklar varsa) ağır araca çarpınca daha çok savrulsun. Dreadnought (dev boss araç) hiç savrulmasın.

**B. Duvara sürtünme ("sıyrılma")**
1. Araç bir duvarla temastayken (collide olayından son temas zamanı ve normal tutulabilir):
   - Hızın duvara doğru olan bileşenini sıfırla.
   - Duvara paralel bileşeni koru ama her saniye ~%30 azalt (sürtünme hissi).
   - Direksiyon ve motor normal çalışmaya devam etsin.
2. Araç duvara saplanıp hızı ~0'a indiyse ve oyuncu gaz + direksiyon veriyorsa, duvar normali yönünde küçük bir ayırma kuvveti uygula, aracın burnunun duvardan dönebilmesini sağla. Hiçbir zaman ışınlama yapma.
3. Sürtünürken:
   - Temas noktasında sürekli kıvılcım (`spawnSparks` havuzu var, yeni nesne üretme).
   - Sürtünme sesi (`Snd` içinde metal sesleri var; `Snd.gate(key, ms)` ile hız sınırı koy).
   - Hıza bağlı küçük hasar (ör. saniyede 3–6 can, 40 km/sa altında 0).
   - Kamera sarsıntısı çok hafif olsun.
4. Aynısını AI araçlarına da uygula (onlar da bariyere yapışıp kalmasın). AI'nın takılı kaldığını anlayıp geri vites yapma mantığı varsa koru.

**C. Takla ve düzelme**
1. `updateRollOverRecovery` düzeltmesi yalnızca şu durumda tetiklensin:
   - araç ters ya da yan yatmış (`up.y < 0.3`),
   - en az 2 tekerlek yere değmiyor ya da gövde yerde,
   - hız < 3 m/sn,
   - bu durum 1.5 sn sürmüş.
2. Düzeltme ışınlama olmasın. Aracı ~0.5 sn içinde yumuşakça çevir (`quaternion.slerp` ile ya da tork vererek), en fazla 0.6 m kaldır.
3. **Havadayken hiçbir düzeltme yapılmasın,** araç fiziğin verdiği şekilde dönsün. Yalnızca çok hafif bir hava kontrolü olabilir: havadayken direksiyonla yatay eksende küçük tork; isteğe bağlı, abartma.
4. Duyuru ("PNEUMATİK TAKLA DÜZELTİCİ AKTİF!") ve ses kalsın.

**D. Aklına gelen diğer iyileştirmeler** (A–C'den sonra, ayrı yamalar hâlinde)
- **Çarpışma hasarı:** şu an `relVel > 4.5` olunca sabit formül uygulanıyor. Darbe açısını hesaba kat: önden darbe daha fazla, sürtünme daha az hasar versin. Yan sürtünme hasarı B.3'teki gibi ayrı olsun.
- **Çarpışma sesi ve kamera sarsıntısının şiddeti** darbe hızıyla orantılı olsun (hafif dokunuşta küçük ses).
- **Düşük hızda (< 10 km/sa) araç–araç teması** hasar vermesin, banner çıkarmasın.
- **Rampa ve havada kalış:** iniş sert olursa süspansiyon sıkışma sesi ve hafif sarsıntı olsun; inişte araç zıplayıp yeniden havalanmasın (süspansiyon sönümlemesini kontrol et).
- **Fizik adımı:** `world.step` değişken adımla çağrılıyor. Sabit 1/60 adım + `maxSubSteps 3` önerini yaz, ama **ayrı ve isteğe bağlı bir yama** olarak ver (sürüş hissini değiştirir, kullanıcı oynayarak karar verecek).
- Rakiplerin ve oyuncunun **NaN koruması** (`guardPhysicsNaN`) bozulmasın.

### Kurallar (bunlara mutlaka uy)
- **Performans:**
  - Sahneye yeni `PointLight`/`SpotLight` ekleme (ışık havuzu var, sabit ışık sayısı shader'ların yeniden derlenmesini önlüyor).
  - Her karede `new` ile nesne üretme; geçici `Vec3`/`Vector3` değerleri dosya düzeyinde bir kez oluştur ve yeniden kullan.
  - Mevcut havuzları (`spawnSparks`, duman, patlama) kullan.
- **Mevcut özellikleri koru:**
  - `window.DR` olayları: `playerDamaged`, `takedown`, `aiDeath` vb.
  - Takedown türleri (`resolveTakedownType`; `wall`/`flip` türleri çarpışmaya bağlı, korunsun).
  - Parça kopması (`detachArmorPart`, `detachAIPart`).
  - Barışçıl modda hasar yok (`godMode`).
  - Geri sayım sırasında araçlar frende.
- `js/progression.js` ve `css/progression.css` dosyalarına dokunma.
- Kod yorumları **Türkçe**, kısa ve "neden" açıklayan türden olsun. Mevcut kodun stiline (tek boşluk girinti, kısa satırlar) uy.
- Yeni ayarları dosyada bir yerde topla (ör. `const PHYS = { ... }`) ki sonradan kolayca ayarlansın.
- Oyun dosyaya çift tıklanarak (`file://`) açılabiliyor; `fetch` ile yeni dosya okuma ekleme.

### Teslim biçimi
1. Önce kısa bir **teşhis:** her şikâyetin koddaki kök nedeni (satır ya da fonksiyon adıyla).
2. Sonra **numaralı yamalar.** Her yamada:
   - "Bul" bloğu: `game.js`'te birebir geçen, benzersiz eski kod.
   - "Değiştir" bloğu: yeni kod.
   - Bir cümle: ne değişti, neden.
   - Yamalar A, B, C, D sırasıyla. Fizik adımı yaması en sonda ve "İSTEĞE BAĞLI" diye işaretli.
3. En sonda **kendi test listen:** her şikâyet için oyunda nasıl denenir (ör. "120 km/sa ile bariyere 30° açıyla çarp: araç zıplamamalı, sürtünerek devam etmeli").
4. Belirsiz kaldığın yerleri tahmin etme, "SORU:" diye listele.
