# Virtual IT Office Simulator

Game browser 3D yang menggabungkan **Open World**, **Business Tycoon**, dan **First Person Simulation**.
Dibuat dengan HTML, CSS, JavaScript, Three.js, dan Vite.

## Status pengembangan

- [x] Tahap 1: dunia 3D dan gerak karakter (+ kamera FP/TP dasar)
- [x] Tahap 2: kamera first person dan third person (transisi halus, anti tembus dinding, zoom, head bob, crosshair)
- [x] Tahap 3: objek interaktif (komputer) dan sistem pintu geser (tombol E)
- [x] Tahap 4: Build Mode (taruh, putar, pindah, hapus furniture di dunia 3D)
- [x] Tahap 5: ekonomi tycoon dan shop (uang virtual, harga, penghasilan per detik)
- [x] Tahap 6: NPC karyawan (state + waypoint: rekrut, duduk, bekerja, rapat, istirahat)
- [x] Tahap 7: misi dan manajemen bisnis (Mission Center, Dashboard, keuangan, level, perluasan kantor)
- [x] Tahap 9: gedung bertingkat (sampai 9 lantai, lift), 9 furnitur fungsional, karyawan fokus per jabatan, model orang realistis
- [x] Tahap 8: save system (simpan otomatis tiap 15 detik di browser) dan optimasi (material dipakai bersama, resolusi adaptif, bayangan ringan di HP)

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
| Build Mode | B | Tombol Bangun |
| Company Dashboard (keuangan, karyawan, perluasan) | K | Tombol Kantor |
| Mission Center (dekat komputer yang menyala) | M | Tombol Misi |
| Rekrut karyawan (1 Programmer, 2 Designer, 3 Admin, 4 pecat) | H | Tombol Rekrut |
| Pilih item di shop (Meja, Kursi, Komputer, Server, Tanaman, Lemari, Sofa) | 1 sampai 7 | Tombol di panel |
| Putar / taruh / pindah / jual (60%) | R / E atau klik / F / X | Tombol di panel |

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
├─ economy.js     uang virtual dan penghasilan per detik
├─ build.js       Build Mode: shop, taruh, pindah, jual furniture
├─ furniture.js   model 3D furnitur yang detail
├─ npc.js         karyawan NPC: rekrut, waypoint, duduk, bekerja
├─ company.js     Mission Center, Dashboard, level, perluasan kantor
├─ progress.js    XP, level, dan status perusahaan bersama
├─ save.js        simpan/muat progres (localStorage) dan reset
├─ floors.js      lantai tambahan dan lift
├─ person.js      model orang (sendi, wajah, rambut)
├─ camera.js      kamera first person dan third person
├─ input.js       kontrol PC dan mobile
└─ style.css      tampilan HUD dan kontrol sentuh
```
