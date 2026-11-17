# PilahPintar – Deteksi Sampah Organik, Anorganik, B3 & Bukan Sampah

Web statis (HTML + CSS + JavaScript) untuk mendeteksi sampah **Organik**, **Anorganik**, atau **B3** (atau mengenali benda yang **Bukan Sampah**)
lewat kamera atau unggah foto, lengkap dengan kartu edukasi cara penanganannya.
Model AI berjalan langsung di browser (TensorFlow.js + Teachable Machine), tanpa server.

## Struktur menu (sidebar ☰)
Ikon ☰ di pojok kiri atas membuka panel yang meluncur dari kiri. Halaman berpindah tanpa reload (alamat `#hash`, jadi bisa dibagikan).

| Menu | Isi |
|------|-----|
| 🏠 Profil Website | Latar belakang, visi misi, kredit pembuat |
| 📖 Edukasi Sampah | Ensiklopedia mini Organik vs Anorganik, tabel perbandingan, 3R |
| 📷 Scan Sampah ▾ | **Mulai Scan** (langsung menyalakan kamera), **Cara Kerja** (panduan kamera & unggah), **Contoh Sampah** (4 tab kategori: penjelasan, contoh umum, dan galeri foto scan-mu sendiri) |
| 🏆 Level & Poin | Eco Points, level, progress bar, tangga level |
| 📊 Riwayat & Grafik | Pie chart (Chart.js) Organik vs Anorganik dari `localStorage`, plus scan terakhir |

Mengubah nama pembuat: cari bagian **Kredit Pembuat** di `index.html`. Mengubah contoh galeri: array `CONTOH` di `script.js`.

## Fitur
- Scanner kamera (kamera belakang jadi default di HP, bisa ganti kamera) dengan label langsung saat diarahkan
- Unggah foto (tombol atau drag & drop) dengan pratinjau sebelum dianalisis
- Animasi scan singkat lalu hasil besar: hijau = Organik, kuning = Anorganik, merah = B3, abu-abu = Bukan Sampah ("Hei, ini Bukan Sampah!")
- Tombol **Simpan & Tambah Poin** setelah hasil yakin: menyimpan foto (Base64, 5 terakhir per kategori) dan memberi Eco Points
- Kartu edukasi otomatis: penjelasan + langkah penanganan + warna tempat sampah
- Ambang keyakinan (70%): hasil ragu diganti tips foto yang lebih baik
- Riwayat scan dan grafik lingkaran Organik/Anorganik (disimpan di perangkat; riwayat dan grafik hanya bertambah untuk foto baru, sama seperti poin)
- Sistem Eco Points: +10 poin tiap scan berhasil, papan skor + progress bar di layar scan, dan pop-up konfeti saat naik level
- Mode gelap/terang, responsif untuk HP

## Langkah 1 – Latih model di Teachable Machine
1. Buka <https://teachablemachine.withgoogle.com> > **Image Project** > **Standard image model**.
2. Buat **4 kelas** dengan nama persis seperti ini (kode mengenali kata `organik`, `anorganik`, `b3`, dan `bukan`):

   | Kelas | Isi foto |
   |-------|----------|
   | `Organik` | sisa makanan, daun, ranting, kulit buah |
   | `Anorganik` | botol plastik, kaleng, kardus, bungkus camilan |
   | `B3` | baterai bekas, bohlam rusak, kaleng semprot nyamuk, botol pembersih lantai kimia, obat kedaluwarsa |
   | `Bukan Sampah` | wajah, tangan, meja kelas, lantai kosong, sepatu, tas (sangat penting agar AI tidak memaksa semua gambar jadi sampah) |

   Hati-hati saat memotret B3: jangan membongkar atau memecahkan benda, dan cuci tangan sesudahnya.
3. Kumpulkan minimal 100–200 foto per kelas, dengan variasi latar, cahaya, dan sudut.
   Foto langsung di lingkungan sekolah supaya akurat.
4. Klik **Train Model**, lalu **Export Model** > tab **Tensorflow.js** > **Upload (shareable link)** > **Upload my model**.
5. Salin link yang diberikan, bentuknya seperti:
   `https://teachablemachine.withgoogle.com/models/AbCdEfGhI/`

## Langkah 2 – Pasang link model
Buka `script.js`, ganti baris ini dengan link-mu (harus diakhiri `/`):

```js
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/GANTI_DENGAN_ID_MODELMU/";
```

Selama link belum diganti, web berjalan dalam **mode demo** (hasil acak, hanya untuk melihat tampilan).

## Langkah 3 – Upload ke GitHub dan aktifkan GitHub Pages
1. Buat repository baru di GitHub (misalnya `pilahpintar`).
2. Upload semua file di folder ini (`index.html`, `style.css`, `script.js`, `README.md`) ke root repository.
   Bisa lewat **Add file > Upload files**, lalu **Commit changes**.
3. Buka **Settings > Pages**. Pada **Build and deployment**, pilih **Deploy from a branch**,
   branch `main`, folder `/ (root)`, lalu **Save**.
4. Tunggu 1–2 menit. Webmu aktif di `https://USERNAME.github.io/NAMA-REPO/`.

> Kamera hanya bisa dipakai lewat **HTTPS** atau `localhost`. GitHub Pages sudah HTTPS otomatis.

## Mencoba di komputer sendiri
Jangan buka `index.html` langsung dengan klik dua kali (kamera bisa diblokir). Jalankan server lokal:

```bash
python3 -m http.server 8000
```

Lalu buka <http://localhost:8000>.

## Poin & level
| Level | Poin | Tercapai setelah |
|-------|------|------------------|
| 🌰 Pemula | 0 - 90 | (fase perkenalan) |
| 🌱 Beginner | 100 - 240 | 10x scan |
| 🤝 Friend | 250 - 490 | 25x scan |
| 🦸‍♂️ Hero | 500 - 990 | 50x scan |
| 🌍 Earth Guardian | 1000+ | 100x scan |

- Poin (+10) diberikan saat tombol **Simpan & Tambah Poin** ditekan, hanya untuk hasil Organik/Anorganik/B3 yang yakin (di atas ambang keyakinan). Benda **Bukan Sampah** boleh disimpan fotonya tetapi tidak memberi poin.
- Satu foto hanya bisa disimpan sekali. Menekan "Analisis" berulang pada foto yang sama tidak menambah poin, riwayat, atau foto; harus foto atau scan baru.
- Poin disimpan di browser masing-masing perangkat (localStorage), jadi tidak ada papan peringkat bersama dan poin tidak berpindah antar HP.
- Foto tersimpan: `MAX_PHOTOS_PER_CAT` (jumlah per kategori) dan `THUMB_MAX` (ukuran foto) di `script.js`. Foto disimpan di `localStorage` (cara ringan, sekitar 20-50 KB per foto). Jika ingin ratusan foto, ganti fungsi `loadPhotos`/`storePhotos` dengan IndexedDB.
- Mengubah batas level atau poin per scan: `LEVELS` dan `POINTS_PER_SCAN` di bagian atas `script.js`.
- Di mode demo (belum ada model), poin tetap bertambah supaya animasi naik level bisa dicoba. Tombol **Reset poin & level** ada di bagian Level.

## Mengubah isi
- Teks edukasi dan warna tempat sampah: objek `INFO` di `script.js`.
- Ambang keyakinan: `CONFIDENCE_THRESHOLD` di `script.js`.
- Nama web, teks hero, nama sekolah: `index.html`.
- Warna dan tema: variabel di bagian atas `style.css`.

## Catatan
- AI bisa keliru pada benda ambigu (kertas basah, kantong teh, kemasan campuran). Itu sebabnya ada ambang keyakinan dan catatan di kartu edukasi.
- Tisu basah kemasan mengandung serat plastik, jadi dikategorikan anorganik di kartu edukasi. Ubah di `INFO` jika sekolahmu punya aturan lain.
- Foto yang dianalisis tidak dikirim ke server mana pun; riwayat dan foto hanya tersimpan di browser pengguna dan bisa dihapus lewat menu Contoh Sampah. Ingat bahwa foto "Bukan Sampah" bisa berisi wajah, jadi jangan bagikan perangkat yang menyimpan foto pribadi.
