# Virtual IT Office Simulator

Game browser 3D yang menggabungkan **Open World**, **Business Tycoon**, dan **First Person Simulation**.
Dibuat dengan HTML, CSS, JavaScript, Three.js, dan Vite.

## Status pengembangan

- [x] Tahap 1: dunia 3D dan gerak karakter (+ kamera FP/TP dasar)
- [x] Tahap 2: kamera first person dan third person (transisi halus, anti tembus dinding, zoom, head bob, crosshair)
- [x] Tahap 3: objek interaktif (komputer) dan sistem pintu geser (tombol E)
- [ ] Tahap 4: gedung kantor dan penempatan furniture (Build Mode)
- [ ] Tahap 5: ekonomi tycoon dan shop
- [ ] Tahap 6: NPC karyawan (state + waypoint)
- [ ] Tahap 7: misi dan manajemen bisnis
- [ ] Tahap 8: save system dan optimasi

## Kontrol

| Aksi | PC | Mobile |
|---|---|---|
| Jalan | WASD | Joystick kiri |
| Lari | Shift | Dorong joystick penuh |
| Lompat | Space | Tombol Lompat |
| Kamera | Mouse (klik layar untuk mengunci) | Geser layar kanan |
| Ganti kamera | V | Tombol Kamera |
| Zoom kamera (third person) | Scroll mouse | - |
| Interaksi (pintu, komputer) | E | Tombol E |

## Jalankan di komputer

```bash
npm install
npm run dev
```
Buka alamat yang muncul di terminal (biasanya http://localhost:5173).

## Upload ke GitHub dan main online (GitHub Pages)

1. Buat repository baru di github.com, misalnya `virtual-it-office` (public).
2. Upload semua isi folder ini ke repository.
   - Lewat web: **Add file > Upload files**. Folder `.github` kadang tidak ikut terupload;
     kalau begitu pakai **Add file > Create new file**, ketik nama `.github/workflows/deploy.yml`,
     lalu tempel isi file `deploy.yml`.
   - Lewat komputer: `git init`, `git add .`, `git commit -m "tahap 1"`,
     `git branch -M main`, `git remote add origin <url-repo>`, `git push -u origin main`.
3. Di repository: **Settings > Pages > Build and deployment > Source: GitHub Actions**.
4. Buka tab **Actions**, tunggu workflow "Deploy ke GitHub Pages" selesai (hijau).
5. Game bisa dimainkan di `https://USERNAME.github.io/virtual-it-office/`.

Setiap kali kamu push ke branch `main`, game otomatis ter-update.

## Rencana ke APK dan Play Store

Setelah game selesai dan stabil: bungkus dengan Capacitor (atau PWABuilder) menjadi Android App Bundle (AAB),
lalu unggah lewat Google Play Console. Pastikan target API sesuai syarat Play Store terbaru.

## Struktur kode

```
src/
├─ main.js        loop utama, menyatukan semua modul
├─ world.js       gedung, ruangan, perabot, daftar collider
├─ collision.js   tabrakan karakter vs dinding/perabot
├─ player.js      model dan gerak karakter
├─ interact.js    pintu geser dan komputer interaktif (tombol E)
├─ camera.js      kamera first person dan third person
├─ input.js       kontrol PC dan mobile
└─ style.css      tampilan HUD dan kontrol sentuh
```
