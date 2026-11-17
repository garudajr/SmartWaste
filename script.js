"use strict";

/* =====================================================================
   PILAHPINTAR – pengaturan utama
   ---------------------------------------------------------------------
   1. Latih model di https://teachablemachine.withgoogle.com (Image Project)
      dengan kelas: "Organik", "Anorganik", dan (disarankan) "Bukan Sampah".
   2. Klik Export Model > Upload (shareable link) > salin link-nya.
   3. Tempel di MODEL_URL di bawah (harus diakhiri tanda "/").
   ===================================================================== */
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/axQhhKyQN/";
const CONFIDENCE_THRESHOLD = 0.70; // di bawah ini hasil dianggap "kurang yakin"
const MIN_SCAN_MS = 900;           // lama minimal animasi scan
const MAX_HISTORY = 100;
const HISTORY_KEY = "pilahpintar_riwayat";
const THEME_KEY = "pilahpintar_tema";
const POINTS_KEY = "pilahpintar_poin";
const TOTAL_KEY = "pilahpintar_total";   // jumlah kumulatif per kategori (untuk grafik)
const PHOTO_KEY = "pilahpintar_foto";    // foto hasil scan (Base64) per kategori
const MAX_PHOTOS_PER_CAT = 5;            // foto terakhir yang disimpan per kategori
const THUMB_MAX = 480;                   // sisi terpanjang foto tersimpan (px)
const POINTS_PER_SCAN = 10;     // poin tiap scan sampah yang berhasil dikenali
const LEVELUP_DELAY_MS = 1600;  // jeda sebelum pop-up naik level muncul

/* Tangga level (ubah batas poin di sini) */
const LEVELS = [
  { nama: "Pemula",         ikon: "🌰",  min: 0,    pesan: "Selamat datang! Mulai scan sampah untuk mengumpulkan Eco Points." },
  { nama: "Beginner",       ikon: "🌱",  min: 100,  pesan: "Langkah pertamamu menjaga sekolah tetap bersih sudah dimulai!" },
  { nama: "Friend",         ikon: "🤝",  min: 250,  pesan: "Kamu jadi sahabat lingkungan. Teruskan kebiasaan baikmu!" },
  { nama: "Hero",           ikon: "🦸‍♂️", min: 500,  pesan: "Kamu pahlawan kebersihan sekolah. Ajak temanmu ikut memilah sampah!" },
  { nama: "Earth Guardian", ikon: "🌍",  min: 1000, pesan: "Gelar tertinggi! Kamu benar-benar penjaga bumi." }
];

const DEMO = MODEL_URL.includes("GANTI_DENGAN");

/* ---------------------------------------------------------------------
   Isi kartu edukasi (ubah teks di sini sesuai kebutuhan sekolahmu)
   --------------------------------------------------------------------- */
const INFO = {
  organik: {
    ikon: "🌿",
    judul: "Apa itu sampah organik?",
    penjelasan: "Sampah organik adalah material alami yang mudah membusuk dan terurai oleh mikroorganisme.",
    langkah: [
      "Pisahkan dari bungkus plastiknya.",
      "Buang ke tempat sampah warna Hijau.",
      "Sampah ini nantinya akan diolah menjadi pupuk kompos untuk taman SMAN 3 Blitar."
    ],
    tong: "🟢 Tempat sampah: Hijau",
    catatan: "Contoh: sisa makanan, kulit buah, daun. Tisu basah kemasan mengandung serat plastik, jadi buang sebagai anorganik."
  },
  anorganik: {
    ikon: "♻️",
    judul: "Apa itu sampah anorganik?",
    penjelasan: "Sampah anorganik adalah material sintesis yang sangat sulit terurai oleh alam.",
    langkah: [
      "Kosongkan sisa cairan atau makanan jika ada.",
      "Remas botol atau lipat kardus untuk menghemat ruang.",
      "Buang ke tempat sampah warna Kuning/Biru.",
      "Sampah ini bisa disetorkan ke Bank Sampah sekolah untuk didaur ulang."
    ],
    tong: "🟡 Tempat sampah: Kuning/Biru",
    catatan: "Contoh: plastik, kertas, kardus, kaca, kaleng."
  },
  ragu: {
    ikon: "🤔",
    judul: "Hasil kurang meyakinkan",
    penjelasan: "AI belum cukup yakin dengan gambar ini. Coba ulangi agar hasilnya lebih akurat.",
    langkah: [
      "Dekatkan kamera ke satu benda sampah saja.",
      "Pastikan cahaya cukup terang dan gambar tidak buram.",
      "Gunakan latar yang polos (meja atau lantai bersih).",
      "Jika masih ragu, tanyakan ke guru atau petugas kebersihan."
    ],
    tong: "",
    catatan: ""
  },
  b3: {
    ikon: "☣️",
    judul: "Apa itu sampah B3?",
    penjelasan: "B3 berarti Bahan Berbahaya dan Beracun. Sampah ini mengandung zat kimia atau logam yang bisa meracuni manusia dan mencemari tanah serta air.",
    langkah: [
      "Jangan dibuang ke tempat sampah biasa dan jangan dibakar.",
      "Jangan dibongkar, dipecahkan, atau ditekan. Pegang dengan hati-hati dan cuci tangan sesudahnya.",
      "Simpan terpisah di wadah tertutup, jauh dari anak kecil dan sumber panas.",
      "Serahkan ke guru atau petugas kebersihan agar dikumpulkan di tempat penampungan B3."
    ],
    tong: "🔴 Tempat sampah: Merah (B3)",
    catatan: "Contoh: baterai bekas, lampu bohlam rusak, kaleng semprot nyamuk, cairan pembersih kimia, obat kedaluwarsa. Obat kedaluwarsa jangan dibuang ke saluran air; tanyakan cara pembuangannya ke apotek atau puskesmas."
  },
  bukan: {
    ikon: "😄",
    judul: "Hei, ini Bukan Sampah!",
    penjelasan: "Yang terlihat di kamera bukan sampah, jadi tidak perlu dibuang. Mungkin itu wajah, tangan, meja, sepatu, atau tas. Jangan sampai kamu atau barang bagusmu masuk tempat sampah ya!",
    langkah: [
      "Kalau tadi cuma iseng, tidak apa-apa. Senyum dulu 😊",
      "Arahkan kamera ke benda sampah yang ingin dipilah.",
      "Pastikan hanya ada satu benda sampah di dalam bingkai."
    ],
    tong: "",
    catatan: "Benda yang bukan sampah tidak memberi Eco Points."
  }
};

/* ---------------------------------------------------------------------
   Elemen & status
   --------------------------------------------------------------------- */
const $ = (id) => document.getElementById(id);
const el = {
  btnTheme: $("btnTheme"),
  btnMenu: $("btnMenu"), btnMenuClose: $("btnMenuClose"), sidebar: $("sidebar"), overlay: $("overlay"),
  btnScanGroup: $("btnScanGroup"), scanSub: $("scanSub"), navScan: $("navScan"),
  sbPoints: $("sbPoints"), sbLevel: $("sbLevel"), tabPanel: $("tabPanel"), tabs: $("tabs"),
  saveBox: $("saveBox"), btnSave: $("btnSave"), saveHint: $("saveHint"), countB3: $("countB3"),
  lvEmoji: $("lvEmoji"), lvName: $("lvName"), lvPoints: $("lvPoints"), lvBar: $("lvBar"),
  lvFill: $("lvFill"), lvNext: $("lvNext"), lvScans: $("lvScans"),
  chartWrap: $("chartWrap"), pieChart: $("pieChart"), chartEmpty: $("chartEmpty"), chartSummary: $("chartSummary"),
  btnCamera: $("btnCamera"), btnUpload: $("btnUpload"), fileInput: $("fileInput"),
  btnAnalyze: $("btnAnalyze"), btnSwitch: $("btnSwitch"), btnReset: $("btnReset"),
  notice: $("notice"), stage: $("stage"), placeholder: $("placeholder"),
  video: $("video"), preview: $("preview"), liveBadge: $("liveBadge"), loading: $("loading"),
  modelStatus: $("modelStatus"), demoBanner: $("demoBanner"),
  result: $("result"), resultBanner: $("resultBanner"), resultIcon: $("resultIcon"),
  resultLabel: $("resultLabel"), resultSub: $("resultSub"), resultPct: $("resultPct"), confBar: $("confBar"),
  eduCard: $("eduCard"), eduIcon: $("eduIcon"), eduTitle: $("eduTitle"), eduDesc: $("eduDesc"),
  eduSteps: $("eduSteps"), eduBin: $("eduBin"), eduNote: $("eduNote"),
  historyList: $("historyList"), historyEmpty: $("historyEmpty"), btnClearHistory: $("btnClearHistory"),
  countOrganik: $("countOrganik"), countAnorganik: $("countAnorganik"),
  hud: $("hud"), hudPoints: $("hudPoints"), hudLevel: $("hudLevel"), hudBar: $("hudBar"),
  hudFill: $("hudFill"), hudNext: $("hudNext"), pointsGain: $("pointsGain"),
  levelList: $("levelList"), btnResetPoints: $("btnResetPoints"),
  levelModal: $("levelModal"), levelEmoji: $("levelEmoji"), levelTitle: $("levelTitle"),
  levelDesc: $("levelDesc"), btnLevelClose: $("btnLevelClose"), confetti: $("confetti")
};

let model = null;
let modelPromise = null;
let stream = null;
let facing = "environment";
let mode = "idle"; // "idle" | "camera" | "image"
let busy = false;
let liveTimer = null;
let points = 0;         // total Eco Points
let imageId = 0;        // naik tiap ada foto baru (kamera/upload)
let lastSavedId = 0;    // foto terakhir yang sudah disimpan
let pending = null;     // hasil scan yang bisa disimpan: { hasil, kat, id, source }
let lastFocus = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------------------------------------------------------------
   Utilitas
   --------------------------------------------------------------------- */
function kategori(namaKelas) {
  const n = String(namaKelas).toLowerCase();
  if (n.includes("bukan")) return "bukan";
  if (n.includes("b3") || n.includes("berbahaya") || n.includes("beracun")) return "b3";
  if (n.includes("anorganik") || n.includes("non-organik") || n.includes("non organik")) return "anorganik";
  if (n.includes("organik")) return "organik";
  return "bukan"; // kelas tak dikenal dianggap bukan sampah
}

const NAMA_KAT = { organik: "Organik", anorganik: "Anorganik", b3: "B3", bukan: "Bukan Sampah" };

function showNotice(msg) {
  el.notice.textContent = msg;
  el.notice.hidden = !msg;
}

function safeGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* diabaikan */ }
}

/* ---------------------------------------------------------------------
   Tema gelap / terang
   --------------------------------------------------------------------- */
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  el.btnTheme.textContent = theme === "dark" ? "☀️" : "🌙";
}
function initTheme() {
  const saved = safeGet(THEME_KEY);
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (prefersDark ? "dark" : "light"));
}
el.btnTheme.addEventListener("click", () => {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  applyTheme(next);
  safeSet(THEME_KEY, next);
  if (currentView === "riwayat") renderChart();
});

/* ---------------------------------------------------------------------
   Model AI
   --------------------------------------------------------------------- */
function ensureModel() {
  if (model) return Promise.resolve(model);
  if (modelPromise) return modelPromise;
  if (typeof tmImage === "undefined") {
    return Promise.reject(new Error("Library AI belum termuat. Periksa koneksi internet."));
  }
  el.modelStatus.textContent = "Memuat model AI…";
  el.modelStatus.hidden = false;
  modelPromise = tmImage
    .load(MODEL_URL + "model.json", MODEL_URL + "metadata.json")
    .then((m) => { model = m; el.modelStatus.hidden = true; return m; })
    .catch((err) => {
      modelPromise = null;
      el.modelStatus.hidden = true;
      throw err;
    });
  return modelPromise;
}

async function classify(source) {
  if (DEMO) {
    await sleep(300);
    const pilihan = ["Organik", "Anorganik", "B3", "Bukan Sampah"];
    const nama = pilihan[Math.floor(Math.random() * pilihan.length)];
    return { nama, prob: 0.78 + Math.random() * 0.2 };
  }
  const m = await ensureModel();
  const preds = await m.predict(source);
  preds.sort((a, b) => b.probability - a.probability);
  return { nama: preds[0].className, prob: preds[0].probability };
}

/* ---------------------------------------------------------------------
   Tampilan area scan
   --------------------------------------------------------------------- */
function setMode(m) {
  mode = m;
  el.placeholder.hidden = m !== "idle";
  el.video.hidden = m !== "camera";
  el.preview.hidden = m !== "image";
  el.liveBadge.hidden = !(m === "camera" && !DEMO);
  el.btnSwitch.hidden = m !== "camera";
  el.btnAnalyze.hidden = m === "idle";
  el.btnReset.hidden = m === "idle";
  el.btnAnalyze.textContent = m === "camera" ? "📸 Scan Sekarang" : "🔍 Analisis Foto";
  el.stage.style.borderStyle = m === "idle" ? "dashed" : "solid";
}

function setLoading(on) {
  el.loading.hidden = !on;
  el.btnAnalyze.disabled = on;
  el.btnSwitch.disabled = on;
  el.btnReset.disabled = on;
}

function hideResult() {
  pending = null;
  el.saveBox.hidden = true;
  el.pointsGain.hidden = true;
  el.result.hidden = true;
  el.confBar.style.width = "0";
}

/* ---------------------------------------------------------------------
   Kamera
   --------------------------------------------------------------------- */
function stopLive() {
  if (liveTimer) { clearTimeout(liveTimer); liveTimer = null; }
}

function stopCamera() {
  stopLive();
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  el.video.srcObject = null;
}

async function startCamera() {
  showNotice("");
  hideResult();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showNotice("Kamera tidak tersedia. Buka web ini lewat HTTPS (misalnya GitHub Pages) dan gunakan browser terbaru, atau pakai tombol Upload Foto.");
    return;
  }
  stopCamera();
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false
    });
    el.video.srcObject = stream;
    await el.video.play();
    setMode("camera");
    startLive();
    scrollToScanner();
  } catch (err) {
    stopCamera();
    if (err && err.name === "NotAllowedError") {
      showNotice("Izin kamera ditolak. Aktifkan izin kamera di pengaturan browser, lalu coba lagi. Atau gunakan Upload Foto.");
    } else if (err && err.name === "NotFoundError") {
      showNotice("Kamera tidak ditemukan di perangkat ini. Gunakan Upload Foto.");
    } else {
      showNotice("Kamera tidak bisa dibuka. Pastikan tidak dipakai aplikasi lain, lalu coba lagi.");
    }
  }
}

/* Prediksi langsung (live) saat kamera aktif */
function startLive() {
  stopLive();
  if (DEMO) return;
  const tick = async () => {
    if (mode !== "camera") { liveTimer = null; return; }
    if (!busy && el.video.readyState >= 2) {
      try {
        const m = await ensureModel();
        const preds = await m.predict(el.video);
        preds.sort((a, b) => b.probability - a.probability);
        const top = preds[0];
        const kat = kategori(top.className);
        const pct = Math.round(top.probability * 100);
        const yakin = top.probability >= CONFIDENCE_THRESHOLD;
        el.liveBadge.className = "live-badge" + (kat !== "bukan" && yakin ? " is-" + kat : "");
        el.liveBadge.textContent = kat === "bukan" ? (yakin ? "Bukan sampah 🙂" : "Arahkan ke sampah") : NAMA_KAT[kat] + " " + pct + "%";
      } catch (e) { /* abaikan error sesaat */ }
    }
    if (mode === "camera") liveTimer = setTimeout(tick, 700);
  };
  liveTimer = setTimeout(tick, 400);
}

el.btnSwitch.addEventListener("click", () => {
  facing = facing === "environment" ? "user" : "environment";
  startCamera();
});

/* ---------------------------------------------------------------------
   Upload foto
   --------------------------------------------------------------------- */
function loadImageFile(file) {
  showNotice("");
  hideResult();
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showNotice("File harus berupa gambar (JPG atau PNG).");
    return;
  }
  if (file.size > 12 * 1024 * 1024) {
    showNotice("Ukuran foto terlalu besar (maksimal 12 MB).");
    return;
  }
  stopCamera();
  if (el.preview.dataset.objectUrl) URL.revokeObjectURL(el.preview.dataset.objectUrl);
  const url = URL.createObjectURL(file);
  el.preview.dataset.objectUrl = url;
  el.preview.onload = () => { imageId++; setMode("image"); scrollToScanner(); };
  el.preview.src = url;
}

el.fileInput.addEventListener("change", (e) => {
  loadImageFile(e.target.files[0]);
  e.target.value = "";
});

["dragenter", "dragover"].forEach((ev) =>
  el.stage.addEventListener(ev, (e) => { e.preventDefault(); el.stage.classList.add("dragover"); })
);
["dragleave", "drop"].forEach((ev) =>
  el.stage.addEventListener(ev, (e) => { e.preventDefault(); el.stage.classList.remove("dragover"); })
);
el.stage.addEventListener("drop", (e) => {
  const file = e.dataTransfer && e.dataTransfer.files[0];
  loadImageFile(file);
});

/* ---------------------------------------------------------------------
   Analisis
   --------------------------------------------------------------------- */
async function analyze() {
  if (busy || mode === "idle") return;
  busy = true;
  showNotice("");
  hideResult();
  setLoading(true);
  const t0 = performance.now();

  try {
    let source;
    if (mode === "camera") {
      // Ambil satu bingkai dari video, bekukan sebagai foto
      const c = document.createElement("canvas");
      c.width = el.video.videoWidth || 640;
      c.height = el.video.videoHeight || 480;
      c.getContext("2d").drawImage(el.video, 0, 0, c.width, c.height);
      imageId++;
      el.preview.onload = null;
      el.preview.src = c.toDataURL("image/jpeg", 0.92);
      stopCamera();
      setMode("image");
      source = c;
    } else {
      source = el.preview;
    }

    const hasil = await classify(source);
    const sisa = MIN_SCAN_MS - (performance.now() - t0);
    if (sisa > 0) await sleep(sisa);

    renderResult(hasil);
    prepareSave(hasil, source);
  } catch (err) {
    console.error(err);
    showNotice("Gagal menganalisis gambar. Pastikan MODEL_URL benar dan koneksi internet aktif, lalu coba lagi.");
  } finally {
    busy = false;
    setLoading(false);
  }
}

el.btnAnalyze.addEventListener("click", analyze);

function resetAll() {
  stopCamera();
  if (el.preview.dataset.objectUrl) {
    URL.revokeObjectURL(el.preview.dataset.objectUrl);
    delete el.preview.dataset.objectUrl;
  }
  el.preview.removeAttribute("src");
  showNotice("");
  hideResult();
  setMode("idle");
}
el.btnReset.addEventListener("click", resetAll);

/* ---------------------------------------------------------------------
   Hasil & kartu edukasi
   --------------------------------------------------------------------- */
function renderResult(hasil) {
  const kat = kategori(hasil.nama);
  const pct = Math.round(hasil.prob * 100);
  let state = kat;
  if (hasil.prob < CONFIDENCE_THRESHOLD) state = "ragu";

  const ikon = { organik: "✅", anorganik: "♻️", b3: "☣️", ragu: "🤔", bukan: "😄" };
  const label = { organik: "ORGANIK", anorganik: "ANORGANIK", b3: "B3", ragu: "KURANG YAKIN", bukan: "BUKAN SAMPAH" };
  const sub = {
    organik: "Sampah organik",
    anorganik: "Sampah anorganik",
    b3: "Sampah berbahaya dan beracun",
    ragu: "Dugaan: " + NAMA_KAT[kat],
    bukan: "Hei, ini Bukan Sampah!"
  };

  el.resultBanner.className = "result-banner is-" + state;
  el.resultIcon.textContent = ikon[state];
  el.resultLabel.textContent = label[state];
  el.resultSub.textContent = DEMO ? sub[state] + " · hasil contoh (mode demo)" : sub[state];
  el.resultPct.textContent = pct + "%";

  const info = INFO[state];
  el.eduCard.className = "card edu is-" + state;
  el.eduIcon.textContent = info.ikon;
  el.eduTitle.textContent = info.judul;
  el.eduDesc.textContent = info.penjelasan;
  el.eduSteps.textContent = "";
  info.langkah.forEach((teks) => {
    const li = document.createElement("li");
    li.textContent = teks;
    el.eduSteps.appendChild(li);
  });
  el.eduBin.textContent = info.tong;
  el.eduBin.hidden = !info.tong;
  el.eduNote.textContent = info.catatan;
  el.eduNote.hidden = !info.catatan;

  el.result.hidden = false;
  el.confBar.style.width = "0";
  requestAnimationFrame(() => requestAnimationFrame(() => { el.confBar.style.width = pct + "%"; }));
  el.result.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ---------------------------------------------------------------------
   Riwayat (disimpan di perangkat, localStorage)
   --------------------------------------------------------------------- */
function loadHistory() {
  try {
    const data = JSON.parse(safeGet(HISTORY_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch (e) { return []; }
}

const KAT_SAMPAH = ["organik", "anorganik", "b3"]; // yang masuk riwayat, grafik, dan poin

function loadTotals() {
  try {
    const o = JSON.parse(safeGet(TOTAL_KEY));
    if (o && Number.isFinite(o.organik) && Number.isFinite(o.anorganik)) {
      return {
        organik: Math.max(0, o.organik | 0),
        anorganik: Math.max(0, o.anorganik | 0),
        b3: Math.max(0, (o.b3 | 0))
      };
    }
  } catch (e) { /* lanjut ke cadangan */ }
  // Cadangan (data lama): hitung dari riwayat yang sudah ada
  const data = loadHistory();
  const t = { organik: 0, anorganik: 0, b3: 0 };
  data.forEach((d) => { if (t[d.kat] !== undefined) t[d.kat]++; });
  return t;
}

function saveHistory(hasil) {
  const kat = kategori(hasil.nama);
  if (!KAT_SAMPAH.includes(kat) || hasil.prob < CONFIDENCE_THRESHOLD) return;
  const totals = loadTotals(); // dibaca sebelum riwayat berubah
  totals[kat] += 1;
  safeSet(TOTAL_KEY, JSON.stringify(totals));
  const data = loadHistory();
  data.unshift({ kat, prob: hasil.prob, t: Date.now() });
  safeSet(HISTORY_KEY, JSON.stringify(data.slice(0, MAX_HISTORY)));
  renderHistory();
}

function renderHistory() {
  const data = loadHistory();
  const totals = loadTotals();
  el.countOrganik.textContent = totals.organik;
  el.countAnorganik.textContent = totals.anorganik;
  el.countB3.textContent = totals.b3;
  el.lvScans.textContent = totals.organik + totals.anorganik + totals.b3;
  el.historyList.textContent = "";
  data.slice(0, 8).forEach((d) => {
    const li = document.createElement("li");
    const badge = document.createElement("span");
    badge.className = "badge " + d.kat;
    badge.textContent = NAMA_KAT[d.kat] || d.kat;
    const info = document.createElement("span");
    info.className = "muted small";
    info.textContent = Math.round(d.prob * 100) + "% · " +
      new Date(d.t).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    li.append(badge, info);
    el.historyList.appendChild(li);
  });
  el.historyEmpty.hidden = data.length > 0;
  el.btnClearHistory.hidden = data.length === 0;
  if (currentView === "riwayat") renderChart();
}

el.btnClearHistory.addEventListener("click", () => {
  if (confirm("Hapus semua riwayat scan dan data grafik di perangkat ini? (Foto di galeri Contoh Sampah tidak ikut terhapus.)")) {
    safeSet(HISTORY_KEY, "[]");
    safeSet(TOTAL_KEY, JSON.stringify({ organik: 0, anorganik: 0, b3: 0 }));
    renderHistory();
  }
});

/* ---------------------------------------------------------------------
   Grafik lingkaran (Chart.js) dari data localStorage
   --------------------------------------------------------------------- */
const CHART_EMPTY_TEXT = "Belum ada data untuk grafik. Coba scan sampah pertamamu!";
let pieChart = null;

function destroyChart() {
  if (pieChart) { pieChart.destroy(); pieChart = null; }
}

// Pembulatan persen yang totalnya selalu 100
function persen(nilai, total) {
  const mentah = nilai.map((v) => (v / total) * 100);
  const hasil = mentah.map(Math.floor);
  let sisa = 100 - hasil.reduce((a, b) => a + b, 0);
  mentah
    .map((m, i) => ({ i, f: m - Math.floor(m) }))
    .sort((a, b) => b.f - a.f)
    .forEach((x) => { if (sisa > 0) { hasil[x.i]++; sisa--; } });
  return hasil;
}

function renderChart() {
  const t = loadTotals();
  const nilai = [t.organik, t.anorganik, t.b3];
  const total = nilai.reduce((a, b) => a + b, 0);

  if (total === 0) {
    destroyChart();
    el.chartWrap.hidden = true;
    el.chartEmpty.textContent = CHART_EMPTY_TEXT;
    el.chartEmpty.hidden = false;
    el.chartSummary.textContent = "";
    return;
  }

  const [pOrg, pAno, pB3] = persen(nilai, total);
  el.chartSummary.textContent = total + " sampah tersimpan · Organik " + pOrg + "% · Anorganik " + pAno + "% · B3 " + pB3 + "%";
  el.pieChart.setAttribute("aria-label",
    "Diagram lingkaran: " + t.organik + " organik (" + pOrg + " persen), " + t.anorganik + " anorganik (" + pAno + " persen), " + t.b3 + " B3 (" + pB3 + " persen)");

  if (typeof Chart === "undefined") {
    destroyChart();
    el.chartWrap.hidden = true;
    el.chartEmpty.textContent = "Grafik tidak bisa dimuat (library Chart.js butuh internet). Angka di bawah tetap akurat.";
    el.chartEmpty.hidden = false;
    return;
  }

  el.chartEmpty.hidden = true;
  el.chartWrap.hidden = false;
  const css = getComputedStyle(document.documentElement);
  const warnaTeks = css.getPropertyValue("--text").trim() || "#12301c";
  const warnaKartu = css.getPropertyValue("--card").trim() || "#ffffff";

  destroyChart();
  pieChart = new Chart(el.pieChart, {
    type: "pie",
    data: {
      labels: ["Organik", "Anorganik", "B3"],
      datasets: [{
        data: nilai,
        backgroundColor: ["#22c55e", "#eab308", "#ef4444"],
        borderColor: warnaKartu,
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: "bottom", labels: { color: warnaTeks, font: { size: 14, weight: "600" }, padding: 16 } },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed;
              return " " + ctx.label + ": " + v + " scan (" + Math.round((v / total) * 100) + "%)";
            }
          }
        }
      }
    }
  });
}

/* ---------------------------------------------------------------------
   Foto hasil scan (Base64 di localStorage, 5 terakhir per kategori)
   Cara ringan untuk prototipe. Kalau nanti ingin ratusan foto, ganti
   loadPhotos/storePhotos dengan IndexedDB.
   --------------------------------------------------------------------- */
const KAT_FOTO = ["organik", "anorganik", "b3", "bukan"];

function loadPhotos() {
  let o = {};
  try { o = JSON.parse(safeGet(PHOTO_KEY) || "{}") || {}; } catch (e) { o = {}; }
  const hasil = {};
  KAT_FOTO.forEach((k) => { hasil[k] = Array.isArray(o[k]) ? o[k] : []; });
  return hasil;
}

function storePhotos(o) {
  try { localStorage.setItem(PHOTO_KEY, JSON.stringify(o)); return true; }
  catch (e) { return false; }
}

/* Perkecil gambar lalu ubah ke teks Base64 (JPEG) */
function makeThumb(src) {
  try {
    const w = src.naturalWidth || src.width;
    const h = src.naturalHeight || src.height;
    if (!w || !h) return null;
    const skala = Math.min(1, THUMB_MAX / Math.max(w, h));
    const c = document.createElement("canvas");
    c.width = Math.round(w * skala);
    c.height = Math.round(h * skala);
    c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.7);
  } catch (e) { return null; }
}

function savePhoto(kat, img, prob) {
  const o = loadPhotos();
  o[kat].unshift({ img, prob, t: Date.now() });
  o[kat] = o[kat].slice(0, MAX_PHOTOS_PER_CAT);
  let ok = storePhotos(o);
  // Memori penuh: buang foto terlama dari kategori yang paling banyak, lalu coba lagi
  while (!ok) {
    const kandidat = KAT_FOTO
      .filter((k) => o[k].length > (k === kat ? 1 : 0))
      .sort((a, b) => o[b].length - o[a].length);
    if (!kandidat.length) break;
    o[kandidat[0]].pop();
    ok = storePhotos(o);
  }
  return ok;
}

function deletePhoto(kat, t) {
  const o = loadPhotos();
  o[kat] = o[kat].filter((f) => f.t !== t);
  storePhotos(o);
}

/* ---------------------------------------------------------------------
   Poin & level (Eco Points)
   --------------------------------------------------------------------- */
function loadPoints() {
  const n = parseInt(safeGet(POINTS_KEY), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function levelIndex(p) {
  let idx = 0;
  LEVELS.forEach((lv, i) => { if (p >= lv.min) idx = i; });
  return idx;
}

function renderPoints(animate) {
  const idx = levelIndex(points);
  const lv = LEVELS[idx];
  const next = LEVELS[idx + 1];
  let pct = 100;
  let teksNext = "Level tertinggi! 🎉";
  if (next) {
    pct = Math.round(((points - lv.min) / (next.min - lv.min)) * 100);
    teksNext = (next.min - points) + " poin lagi ke " + next.ikon + " " + next.nama;
  }

  // Papan skor mini + progress bar
  el.hudPoints.textContent = points;
  el.hudLevel.textContent = lv.ikon + " " + lv.nama;
  el.hudFill.style.width = pct + "%";
  el.hudBar.setAttribute("aria-valuenow", String(pct));
  el.hudNext.textContent = teksNext;

  // Halaman Level & Poin
  el.lvEmoji.textContent = lv.ikon;
  el.lvName.textContent = lv.nama;
  el.lvPoints.textContent = points;
  el.lvFill.style.width = pct + "%";
  el.lvBar.setAttribute("aria-valuenow", String(pct));
  el.lvNext.textContent = teksNext;

  // Ringkasan di sidebar
  el.sbPoints.textContent = points;
  el.sbLevel.textContent = lv.ikon + " " + lv.nama;

  // Tangga level
  el.levelList.textContent = "";
  LEVELS.forEach((l, i) => {
    const li = document.createElement("li");
    li.className = i < idx ? "done" : i === idx ? "now" : "";
    const ikon = document.createElement("span");
    ikon.className = "lv-icon";
    ikon.textContent = l.ikon;
    const nama = document.createElement("strong");
    nama.textContent = l.nama;
    const aturan = document.createElement("span");
    aturan.className = "muted small";
    aturan.textContent = i === 0 ? "mulai dari 0 poin" : l.min + " poin · " + (l.min / POINTS_PER_SCAN) + "x scan";
    const status = document.createElement("span");
    status.className = "lv-status";
    status.textContent = i < idx ? "✓" : i === idx ? "Level kamu" : "";
    li.append(ikon, nama, aturan, status);
    el.levelList.appendChild(li);
  });

  if (animate) {
    el.hud.classList.remove("bump");
    void el.hud.offsetWidth; // mulai ulang animasi
    el.hud.classList.add("bump");
  }
}

function showGain(teks, sukses) {
  el.pointsGain.textContent = teks;
  el.pointsGain.className = "points-gain" + (sukses ? "" : " is-info");
  el.pointsGain.hidden = false;
}

/* Dipanggil setelah hasil tampil: munculkan tombol simpan hanya untuk
   hasil yang yakin. Poin & foto baru tercatat saat tombol ditekan. */
function prepareSave(hasil, source) {
  pending = null;
  el.pointsGain.hidden = true;
  if (hasil.prob < CONFIDENCE_THRESHOLD) { el.saveBox.hidden = true; return; }
  pending = { hasil, kat: kategori(hasil.nama), id: imageId, source };
  updateSaveBox();
}

function updateSaveBox() {
  if (!pending) { el.saveBox.hidden = true; return; }
  const sudah = pending.id === lastSavedId;
  const poin = pending.kat !== "bukan";
  el.btnSave.disabled = sudah;
  el.btnSave.textContent = sudah
    ? "✓ Sudah disimpan"
    : poin ? "💾 Simpan & Tambah Poin (+" + POINTS_PER_SCAN + ")" : "💾 Simpan Foto (tanpa poin)";
  el.saveHint.textContent = "Foto hanya disimpan di perangkat ini (maksimal " + MAX_PHOTOS_PER_CAT +
    " terakhir per kategori) dan bisa dihapus dari menu Contoh Sampah.";
  el.saveBox.hidden = false;
}

function savePending() {
  const p = pending;
  if (!p || p.id !== imageId || imageId === lastSavedId) return;
  lastSavedId = imageId;

  const thumb = makeThumb(p.source);
  const fotoOk = thumb ? savePhoto(p.kat, thumb, p.hasil.prob) : false;
  const catatanFoto = fotoOk ? "" : " Foto tidak bisa disimpan (memori browser penuh).";

  if (p.kat === "bukan") {
    showGain("Foto disimpan di galeri Bukan Sampah 😄 Tidak ada poin untuk benda yang bukan sampah." + catatanFoto, false);
  } else {
    saveHistory(p.hasil);
    const sebelum = levelIndex(points);
    points += POINTS_PER_SCAN;
    safeSet(POINTS_KEY, String(points));
    const sesudah = levelIndex(points);
    renderPoints(true);
    showGain("+" + POINTS_PER_SCAN + " Eco Points 🟢 · Total " + points + catatanFoto, true);
    if (sesudah > sebelum) {
      // Tahan hasil scan sebentar, baru munculkan pop-up naik level
      setTimeout(() => openLevelUp(sesudah), LEVELUP_DELAY_MS);
    }
  }
  updateSaveBox();
  renderContoh();
}

el.btnSave.addEventListener("click", savePending);

function launchConfetti() {
  el.confetti.textContent = "";
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const warna = ["#22c55e", "#facc15", "#38bdf8", "#f472b6", "#fb923c", "#a78bfa"];
  for (let i = 0; i < 80; i++) {
    const s = document.createElement("span");
    s.style.left = Math.random() * 100 + "%";
    s.style.background = warna[i % warna.length];
    s.style.width = 6 + Math.random() * 6 + "px";
    s.style.height = 10 + Math.random() * 8 + "px";
    s.style.animationDuration = 2.8 + Math.random() * 2.4 + "s";
    s.style.animationDelay = Math.random() * 1.2 + "s";
    s.style.setProperty("--drift", Math.random() * 160 - 80 + "px");
    el.confetti.appendChild(s);
  }
}

function openLevelUp(idx) {
  const lv = LEVELS[idx];
  const next = LEVELS[idx + 1];
  el.levelEmoji.textContent = lv.ikon;
  el.levelTitle.textContent = "SELAMAT! Kamu naik level menjadi " + lv.nama.toUpperCase() + "!";
  el.levelDesc.textContent = lv.pesan + (next
    ? " Target berikutnya: " + next.nama + " di " + next.min + " poin."
    : " Kamu sudah di level tertinggi!");
  lastFocus = document.activeElement;
  el.levelModal.hidden = false;
  document.body.classList.add("modal-open");
  launchConfetti();
  el.btnLevelClose.focus();
}

function closeLevelUp() {
  if (el.levelModal.hidden) return;
  el.levelModal.hidden = true;
  document.body.classList.remove("modal-open");
  el.confetti.textContent = "";
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

el.btnLevelClose.addEventListener("click", closeLevelUp);
el.levelModal.addEventListener("click", (e) => { if (e.target === el.levelModal) closeLevelUp(); });
document.addEventListener("keydown", (e) => {
  if (el.levelModal.hidden) return;
  if (e.key === "Escape") closeLevelUp();
  if (e.key === "Tab") { e.preventDefault(); el.btnLevelClose.focus(); } // satu tombol saja: fokus tetap di dalam pop-up
});

el.btnResetPoints.addEventListener("click", () => {
  if (confirm("Reset Eco Points dan level ke 0 di perangkat ini?")) {
    points = 0;
    safeSet(POINTS_KEY, "0");
    renderPoints(false);
  }
});

/* ---------------------------------------------------------------------
   Sidebar menu
   --------------------------------------------------------------------- */
let sidebarOpen = false;
let menuFocus = null;

function openSidebar() {
  if (sidebarOpen) return;
  sidebarOpen = true;
  menuFocus = document.activeElement;
  el.sidebar.classList.add("open");
  el.overlay.classList.add("show");
  el.sidebar.setAttribute("aria-hidden", "false");
  el.btnMenu.setAttribute("aria-expanded", "true");
  document.body.classList.add("menu-open");
  el.btnMenuClose.focus();
}

function closeSidebar(restoreFocus) {
  if (!sidebarOpen) return;
  sidebarOpen = false;
  el.sidebar.classList.remove("open");
  el.overlay.classList.remove("show");
  el.sidebar.setAttribute("aria-hidden", "true");
  el.btnMenu.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");
  if (restoreFocus && menuFocus && menuFocus.focus) menuFocus.focus();
}

function setScanGroup(open) {
  el.scanSub.hidden = !open;
  el.btnScanGroup.setAttribute("aria-expanded", String(open));
  el.navScan.classList.toggle("open", open);
}

el.btnMenu.addEventListener("click", openSidebar);
el.btnMenuClose.addEventListener("click", () => closeSidebar(true));
el.overlay.addEventListener("click", () => closeSidebar(true));
el.btnScanGroup.addEventListener("click", () => setScanGroup(el.scanSub.hidden));

document.addEventListener("keydown", (e) => {
  if (!sidebarOpen || !el.levelModal.hidden) return;
  if (e.key === "Escape") { closeSidebar(true); return; }
  if (e.key === "Tab") { // fokus tetap di dalam sidebar
    const f = Array.from(el.sidebar.querySelectorAll("a[href], button")).filter((n) => n.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

/* ---------------------------------------------------------------------
   Halaman (router sederhana berbasis #hash)
   --------------------------------------------------------------------- */
const VIEWS = ["profil", "edukasi", "scan-mulai", "scan-cara", "scan-contoh", "level", "riwayat"];
const TITLES = {
  "profil": "Profil Website", "edukasi": "Edukasi Sampah", "scan-mulai": "Mulai Scan",
  "scan-cara": "Cara Kerja", "scan-contoh": "Contoh Sampah", "level": "Level & Poin", "riwayat": "Riwayat & Grafik"
};
let currentView = null;

function showView(name) {
  if (!VIEWS.includes(name)) name = "profil";
  if (name === currentView) return;

  // Matikan kamera saat meninggalkan halaman scan
  if (currentView === "scan-mulai" && mode === "camera") resetAll();
  currentView = name;

  document.querySelectorAll(".view").forEach((v) => { v.hidden = v.dataset.view !== name; });
  document.querySelectorAll("[data-nav]").forEach((a) => {
    const aktif = a.dataset.nav === name;
    a.classList.toggle("active", aktif);
    if (aktif) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  if (name.startsWith("scan-")) setScanGroup(true);

  document.title = TITLES[name] + " · PilahPintar";
  window.scrollTo(0, 0);
  if (name === "riwayat") renderChart();
  if (name === "scan-contoh") renderContoh();

  const judul = document.querySelector('.view[data-view="' + name + '"] h1, .view[data-view="' + name + '"] h2');
  if (judul) { judul.setAttribute("tabindex", "-1"); judul.focus({ preventScroll: true }); }
}

function go(name, act) {
  closeSidebar(false);
  if (location.hash !== "#" + name) location.hash = name;
  showView(name);
  // Aksi langsung (dalam klik pengguna, supaya izin kamera/unggah foto diizinkan browser)
  if (act === "camera") startCamera();
  else if (act === "upload") el.fileInput.click();
}

document.addEventListener("click", (e) => {
  const link = e.target.closest("[data-go]");
  if (!link) return;
  e.preventDefault();
  go(link.dataset.go, link.dataset.act);
});

window.addEventListener("hashchange", () => showView(location.hash.slice(1)));

/* ---------------------------------------------------------------------
   Contoh Sampah: tab kategori + galeri foto scan pengguna
   --------------------------------------------------------------------- */
const KAT_INFO = {
  organik: {
    ikon: "🌿", tag: "Tempat Hijau",
    penjelasan: "Sampah organik berasal dari makhluk hidup, mudah membusuk, dan bisa diolah menjadi kompos.",
    contoh: [
      { ikon: "🍌", nama: "Kulit pisang" }, { ikon: "🍎", nama: "Sisa apel" }, { ikon: "🍚", nama: "Nasi sisa" },
      { ikon: "🥬", nama: "Sisa sayur" }, { ikon: "🍂", nama: "Daun kering" }, { ikon: "🌿", nama: "Ranting kecil" },
      { ikon: "🥚", nama: "Cangkang telur" }, { ikon: "☕", nama: "Ampas kopi" }
    ],
    kosong: "Kamu belum pernah menemukan sampah organik."
  },
  anorganik: {
    ikon: "♻️", tag: "Tempat Kuning/Biru",
    penjelasan: "Sampah anorganik sulit terurai oleh alam, tetapi banyak yang bisa didaur ulang lewat Bank Sampah.",
    contoh: [
      { ikon: "🧴", nama: "Botol plastik" }, { ikon: "🥤", nama: "Gelas plastik" }, { ikon: "🛍️", nama: "Kantong plastik" },
      { ikon: "📄", nama: "Kertas" }, { ikon: "📦", nama: "Kardus" }, { ikon: "🥫", nama: "Kaleng" },
      { ikon: "🍾", nama: "Botol kaca" }, { ikon: "🍬", nama: "Bungkus camilan" }
    ],
    kosong: "Kamu belum pernah menemukan sampah anorganik."
  },
  b3: {
    ikon: "☣️", tag: "Tempat Merah",
    penjelasan: "Sampah B3 mengandung bahan beracun. Jangan dicampur dengan sampah lain, jangan dibakar, dan serahkan ke guru atau petugas untuk dikumpulkan.",
    contoh: [
      { ikon: "🔋", nama: "Baterai bekas" }, { ikon: "💡", nama: "Lampu bohlam rusak" }, { ikon: "🦟", nama: "Obat nyamuk semprot" },
      { ikon: "🧪", nama: "Pembersih lantai kimia" }, { ikon: "💊", nama: "Obat kedaluwarsa" }
    ],
    kosong: "Kamu belum pernah menemukan sampah B3."
  },
  bukan: {
    ikon: "🙂", tag: "Tidak perlu dibuang",
    penjelasan: "Kelas ini membantu AI agar tidak salah menebak. Wajah, tangan, meja, lantai, sepatu, dan tas bukan sampah. Kalau temanmu iseng scan wajahnya sendiri, AI akan menjawab: \"Hei, ini Bukan Sampah!\"",
    contoh: [
      { ikon: "🙂", nama: "Wajah manusia" }, { ikon: "✋", nama: "Tangan" }, { ikon: "🪑", nama: "Meja kelas" },
      { ikon: "⬜", nama: "Lantai kosong" }, { ikon: "👟", nama: "Sepatu" }, { ikon: "🎒", nama: "Tas" }
    ],
    kosong: "Belum ada foto bukan-sampah yang disimpan."
  }
};
let activeTab = "organik";

function renderContoh() {
  const foto = loadPhotos();
  const info = KAT_INFO[activeTab];

  // Tab: penanda aktif + jumlah foto
  el.tabs.querySelectorAll("[data-tab]").forEach((b) => {
    const on = b.dataset.tab === activeTab;
    b.setAttribute("aria-selected", String(on));
    b.tabIndex = on ? 0 : -1;
    b.classList.toggle("active", on);
    const n = foto[b.dataset.tab].length;
    b.querySelector(".tab-count").textContent = n ? "(" + n + ")" : "";
  });
  el.tabPanel.className = "tab-panel card cat-" + activeTab;
  el.tabPanel.setAttribute("aria-labelledby", "tab-" + activeTab);
  el.tabPanel.textContent = "";

  const judul = document.createElement("h2");
  judul.textContent = info.ikon + " " + NAMA_KAT[activeTab] + " ";
  const tag = document.createElement("span");
  tag.className = "tag";
  tag.textContent = info.tag;
  judul.appendChild(tag);
  const penj = document.createElement("p");
  penj.className = "muted";
  penj.textContent = info.penjelasan;

  const h3a = document.createElement("h3");
  h3a.textContent = "Contoh Umum (ilustrasi)";
  const grid = document.createElement("ul");
  grid.className = "gallery";
  info.contoh.forEach((c) => {
    const li = document.createElement("li");
    li.className = "gal-item";
    const ik = document.createElement("span");
    ik.className = "gal-ico";
    ik.setAttribute("aria-hidden", "true");
    ik.textContent = c.ikon;
    const nm = document.createElement("strong");
    nm.textContent = c.nama;
    li.append(ik, nm);
    grid.appendChild(li);
  });

  const h3b = document.createElement("h3");
  h3b.textContent = "Galeri Scan Kamu (" + foto[activeTab].length + "/" + MAX_PHOTOS_PER_CAT + ")";
  el.tabPanel.append(judul, penj, h3a, grid, h3b);

  if (foto[activeTab].length === 0) {
    const kosong = document.createElement("p");
    kosong.className = "empty-gallery";
    kosong.textContent = info.kosong;
    const tip = document.createElement("span");
    tip.className = "small";
    tip.textContent = "Scan lalu tekan tombol Simpan, fotonya akan muncul di sini.";
    kosong.append(document.createElement("br"), tip);
    el.tabPanel.appendChild(kosong);
  } else {
    const album = document.createElement("ul");
    album.className = "album";
    foto[activeTab].forEach((f) => {
      const li = document.createElement("li");
      li.className = "photo";
      const img = document.createElement("img");
      img.src = f.img;
      img.alt = "Foto scan " + NAMA_KAT[activeTab] + " tanggal " + new Date(f.t).toLocaleDateString("id-ID");
      img.loading = "lazy";
      const cap = document.createElement("span");
      cap.className = "photo-cap";
      cap.textContent = Math.round(f.prob * 100) + "% · " +
        new Date(f.t).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
      const del = document.createElement("button");
      del.type = "button";
      del.className = "photo-del";
      del.setAttribute("aria-label", "Hapus foto ini");
      del.textContent = "✕";
      del.addEventListener("click", () => {
        if (confirm("Hapus foto ini dari perangkat?")) { deletePhoto(activeTab, f.t); renderContoh(); }
      });
      li.append(img, cap, del);
      album.appendChild(li);
    });
    el.tabPanel.appendChild(album);
  }
}

el.tabs.addEventListener("click", (e) => {
  const b = e.target.closest("[data-tab]");
  if (!b) return;
  activeTab = b.dataset.tab;
  renderContoh();
  b.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
});

el.tabs.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
  const urut = KAT_FOTO;
  const i = urut.indexOf(activeTab);
  activeTab = urut[(i + (e.key === "ArrowRight" ? 1 : urut.length - 1)) % urut.length];
  renderContoh();
  el.tabs.querySelector('[data-tab="' + activeTab + '"]').focus();
});

/* ---------------------------------------------------------------------
   Tombol scanner & inisialisasi
   --------------------------------------------------------------------- */
function scrollToScanner() {
  el.stage.scrollIntoView({ behavior: "smooth", block: "center" });
}

el.btnCamera.addEventListener("click", startCamera);
el.btnUpload.addEventListener("click", () => el.fileInput.click());

// Matikan kamera jika tab disembunyikan (hemat baterai & privasi)
document.addEventListener("visibilitychange", () => {
  if (document.hidden && mode === "camera") { resetAll(); }
});
window.addEventListener("pagehide", stopCamera);

initTheme();
setMode("idle");
points = loadPoints();
renderContoh();
renderHistory();
renderPoints(false);
showView(location.hash.slice(1));
$("year").textContent = new Date().getFullYear();
if (DEMO) el.demoBanner.hidden = false;
else ensureModel().catch(() => showNotice("Model AI gagal dimuat. Periksa MODEL_URL di script.js."));
