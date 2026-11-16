"use strict";

/* =====================================================================
   PILAHPINTAR – pengaturan utama
   ---------------------------------------------------------------------
   1. Latih model di https://teachablemachine.withgoogle.com (Image Project)
      dengan kelas: "Organik", "Anorganik", dan (disarankan) "Bukan Sampah".
   2. Klik Export Model > Upload (shareable link) > salin link-nya.
   3. Tempel di MODEL_URL di bawah (harus diakhiri tanda "/").
   ===================================================================== */
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/GANTI_DENGAN_ID_MODELMU/";
const CONFIDENCE_THRESHOLD = 0.70; // di bawah ini hasil dianggap "kurang yakin"
const MIN_SCAN_MS = 900;           // lama minimal animasi scan
const MAX_HISTORY = 100;
const HISTORY_KEY = "pilahpintar_riwayat";
const THEME_KEY = "pilahpintar_tema";

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
  lain: {
    ikon: "🔍",
    judul: "Sampah tidak terdeteksi",
    penjelasan: "Gambar ini tidak terbaca sebagai sampah (mungkin hanya latar, tangan, atau benda lain).",
    langkah: [
      "Arahkan kamera tepat ke benda sampahnya.",
      "Jauhkan objek lain dari bingkai gambar.",
      "Ulangi scan."
    ],
    tong: "",
    catatan: ""
  }
};

/* ---------------------------------------------------------------------
   Elemen & status
   --------------------------------------------------------------------- */
const $ = (id) => document.getElementById(id);
const el = {
  btnTheme: $("btnTheme"), heroCamera: $("heroCamera"), heroUpload: $("heroUpload"),
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
  countOrganik: $("countOrganik"), countAnorganik: $("countAnorganik")
};

let model = null;
let modelPromise = null;
let stream = null;
let facing = "environment";
let mode = "idle"; // "idle" | "camera" | "image"
let busy = false;
let liveTimer = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------------------------------------------------------------
   Utilitas
   --------------------------------------------------------------------- */
function kategori(namaKelas) {
  const n = String(namaKelas).toLowerCase();
  if (n.includes("anorganik") || n.includes("non-organik") || n.includes("non organik")) return "anorganik";
  if (n.includes("organik")) return "organik";
  return "lain";
}

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
    const nama = Math.random() < 0.5 ? "Organik" : "Anorganik";
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
        el.liveBadge.className = "live-badge" + (kat !== "lain" && top.probability >= CONFIDENCE_THRESHOLD ? " is-" + kat : "");
        el.liveBadge.textContent = kat === "lain" ? "Arahkan ke sampah" : top.className + " " + pct + "%";
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
  el.preview.onload = () => { setMode("image"); scrollToScanner(); };
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
    saveHistory(hasil);
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
  if (kat !== "lain" && hasil.prob < CONFIDENCE_THRESHOLD) state = "ragu";

  const ikon = { organik: "✅", anorganik: "♻️", ragu: "🤔", lain: "🔍" };
  const label = { organik: "ORGANIK", anorganik: "ANORGANIK", ragu: "KURANG YAKIN", lain: "TIDAK TERDETEKSI" };
  const sub = {
    organik: "Sampah organik",
    anorganik: "Sampah anorganik",
    ragu: "Dugaan: " + (kat === "lain" ? hasil.nama : kat === "organik" ? "Organik" : "Anorganik"),
    lain: "Tidak terbaca sebagai sampah"
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

function saveHistory(hasil) {
  const kat = kategori(hasil.nama);
  if (kat === "lain" || hasil.prob < CONFIDENCE_THRESHOLD) return; // hanya hasil yang yakin
  const data = loadHistory();
  data.unshift({ kat, prob: hasil.prob, t: Date.now() });
  safeSet(HISTORY_KEY, JSON.stringify(data.slice(0, MAX_HISTORY)));
  renderHistory();
}

function renderHistory() {
  const data = loadHistory();
  el.countOrganik.textContent = data.filter((d) => d.kat === "organik").length;
  el.countAnorganik.textContent = data.filter((d) => d.kat === "anorganik").length;
  el.historyList.textContent = "";
  data.slice(0, 8).forEach((d) => {
    const li = document.createElement("li");
    const badge = document.createElement("span");
    badge.className = "badge " + d.kat;
    badge.textContent = d.kat === "organik" ? "Organik" : "Anorganik";
    const info = document.createElement("span");
    info.className = "muted small";
    info.textContent = Math.round(d.prob * 100) + "% · " +
      new Date(d.t).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    li.append(badge, info);
    el.historyList.appendChild(li);
  });
  el.historyEmpty.hidden = data.length > 0;
  el.btnClearHistory.hidden = data.length === 0;
}

el.btnClearHistory.addEventListener("click", () => {
  if (confirm("Hapus semua riwayat scan di perangkat ini?")) {
    safeSet(HISTORY_KEY, "[]");
    renderHistory();
  }
});

/* ---------------------------------------------------------------------
   Tombol & inisialisasi
   --------------------------------------------------------------------- */
function scrollToScanner() {
  el.stage.scrollIntoView({ behavior: "smooth", block: "center" });
}

el.btnCamera.addEventListener("click", startCamera);
el.btnUpload.addEventListener("click", () => el.fileInput.click());
el.heroCamera.addEventListener("click", () => { document.getElementById("scanner").scrollIntoView({ behavior: "smooth" }); startCamera(); });
el.heroUpload.addEventListener("click", () => el.fileInput.click());

// Matikan kamera jika tab disembunyikan (hemat baterai & privasi)
document.addEventListener("visibilitychange", () => {
  if (document.hidden && mode === "camera") { resetAll(); }
});
window.addEventListener("pagehide", stopCamera);

initTheme();
setMode("idle");
renderHistory();
$("year").textContent = new Date().getFullYear();
if (DEMO) el.demoBanner.hidden = false;
else ensureModel().catch(() => showNotice("Model AI gagal dimuat. Periksa MODEL_URL di script.js."));
