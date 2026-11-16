# PilahPintar – Deteksi Sampah Organik & Anorganik

Web statis (HTML + CSS + JavaScript) untuk mendeteksi sampah **Organik** atau **Anorganik**
lewat kamera atau unggah foto, lengkap dengan kartu edukasi cara penanganannya.
Model AI berjalan langsung di browser (TensorFlow.js + Teachable Machine), tanpa server.

## Fitur
- Scanner kamera (kamera belakang jadi default di HP, bisa ganti kamera) dengan label langsung saat diarahkan
- Unggah foto (tombol atau drag & drop) dengan pratinjau sebelum dianalisis
- Animasi scan singkat lalu hasil besar: hijau = Organik, kuning = Anorganik
- Kartu edukasi otomatis: penjelasan + langkah penanganan + warna tempat sampah
- Ambang keyakinan (70%): hasil ragu diganti tips foto yang lebih baik
- Riwayat scan dan jumlah Organik/Anorganik (disimpan di perangkat)
- Mode gelap/terang, responsif untuk HP

## Langkah 1 – Latih model di Teachable Machine
1. Buka <https://teachablemachine.withgoogle.com> > **Image Project** > **Standard image model**.
2. Buat kelas dengan nama persis: `Organik` dan `Anorganik`.
   Sangat disarankan menambah kelas ketiga `Bukan Sampah` (foto latar kosong, tangan, lantai, meja)
   agar model tidak memaksa semua gambar jadi Organik/Anorganik.
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

## Mengubah isi
- Teks edukasi dan warna tempat sampah: objek `INFO` di `script.js`.
- Ambang keyakinan: `CONFIDENCE_THRESHOLD` di `script.js`.
- Nama web, teks hero, nama sekolah: `index.html`.
- Warna dan tema: variabel di bagian atas `style.css`.

## Catatan
- AI bisa keliru pada benda ambigu (kertas basah, kantong teh, kemasan campuran). Itu sebabnya ada ambang keyakinan dan catatan di kartu edukasi.
- Tisu basah kemasan mengandung serat plastik, jadi dikategorikan anorganik di kartu edukasi. Ubah di `INFO` jika sekolahmu punya aturan lain.
- Foto yang dianalisis tidak dikirim ke server mana pun; riwayat hanya tersimpan di browser pengguna.
