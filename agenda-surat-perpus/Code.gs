/**
 * Agenda Surat Keluar — Perpustakaan Rona Ilmu SRMP 9 Bandung
 * Penyimpan data (Google Apps Script) untuk halaman web di GitHub Pages.
 *
 * Cara pakai singkat (lihat README.md untuk langkah lengkap):
 * 1. Buka Template_Agenda_Surat_Keluar sebagai Google Spreadsheet, buka Ekstensi > Apps Script, tempel seluruh isi file ini.
 * 2. Ubah KUNCI_AWAL di bawah, lalu jalankan fungsi `siapkan` satu kali.
 * 3. Terapkan > Deployment baru > Aplikasi web; Jalankan sebagai: Saya; Akses: Siapa saja.
 * 4. Salin URL aplikasi web ke bagian PENGATURAN di file index.html.
 */

// Kunci akses yang dibagikan kepada petugas perpustakaan. GANTI sebelum menjalankan `siapkan`.
const KUNCI_AWAL = 'ganti-dengan-kunci-rahasia';

const NAMA_SHEET = 'Agenda';
const KOLOM = ['id', 'urut', 'tahun', 'bulan', 'tanggal', 'nomor', 'jenis', 'perihal', 'tujuan',
  'penandatangan', 'status', 'arsip', 'catatan', 'dicatatOleh', 'dibuatPada', 'diubahPada'];
// Judul kolom yang tampil di Google Sheets (urutan sama dengan KOLOM).
const JUDUL = ['ID', 'No. Urut', 'Tahun', 'Bulan', 'Tanggal Surat', 'Nomor Surat', 'Jenis Dokumen', 'Perihal',
  'Tujuan / Penerima', 'Penandatangan', 'Status', 'Lokasi Arsip', 'Catatan', 'Dicatat Oleh', 'Dibuat Pada', 'Diubah Pada'];
const BOLEH_DIUBAH = ['jenis', 'perihal', 'tujuan', 'penandatangan', 'status', 'arsip', 'catatan'];
const STATUS = ['Draf', 'Ditandatangani', 'Terkirim', 'Dibatalkan'];

/** Jalankan sekali dari editor Apps Script untuk membuat sheet dan menyimpan kunci akses. */
function siapkan() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(NAMA_SHEET);
  if (!sh) sh = ss.insertSheet(NAMA_SHEET);
  sh.getRange(1, 1, 1, JUDUL.length).setValues([JUDUL]).setFontWeight('bold');
  sh.setFrozenRows(1);
  sh.getRange('A:A').setNumberFormat('@'); // id disimpan sebagai teks
  sh.getRange('E:F').setNumberFormat('@'); // tanggal (yyyy-mm-dd) dan nomor surat sebagai teks
  PropertiesService.getScriptProperties().setProperty('KUNCI_AKSES', KUNCI_AWAL);
  Logger.log('Siap. Kunci akses tersimpan.');
}

function kunciBenar_(k) {
  const simpan = PropertiesService.getScriptProperties().getProperty('KUNCI_AKSES');
  return !!simpan && k === simpan;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NAMA_SHEET);
}

function semuaBaris_() {
  const sh = sheet_();
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  const data = sh.getRange(2, 1, n, KOLOM.length).getDisplayValues();
  return data.filter(r => r[0]).map(r => {
    const o = {};
    KOLOM.forEach((k, i) => o[k] = r[i]);
    o.urut = Number(o.urut); o.tahun = Number(o.tahun); o.bulan = Number(o.bulan);
    return o;
  });
}

/** GET ?kunci=...  → daftar semua surat keluar */
function doGet(e) {
  const k = e && e.parameter && e.parameter.kunci;
  if (!kunciBenar_(k)) return json_({ ok: false, pesan: 'Kunci akses salah.' });
  return json_({ ok: true, data: semuaBaris_(), waktu: new Date().toISOString() });
}

/** POST {kunci, aksi: 'tambah'|'ubah', data} */
function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, pesan: 'Permintaan tidak valid.' }); }
  if (!kunciBenar_(body.kunci)) return json_({ ok: false, pesan: 'Kunci akses salah.' });
  const d = body.data || {};
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json_({ ok: false, pesan: 'Server sedang sibuk. Coba simpan lagi.' });
  }
  try {
    if (body.aksi === 'tambah') return json_(tambah_(d));
    if (body.aksi === 'ubah') return json_(ubah_(d));
    return json_({ ok: false, pesan: 'Aksi tidak dikenal.' });
  } finally {
    lock.releaseLock();
  }
}

function bersih_(v, max) { return String(v == null ? '' : v).trim().slice(0, max || 500); }

function tambah_(d) {
  const tanggal = bersih_(d.tanggal, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return { ok: false, pesan: 'Tanggal surat tidak valid.' };
  if (!bersih_(d.perihal) || !bersih_(d.tujuan)) return { ok: false, pesan: 'Perihal dan tujuan wajib diisi.' };
  const tahun = Number(tanggal.slice(0, 4)), bulan = Number(tanggal.slice(5, 7));
  const urut = semuaBaris_().filter(r => r.tahun === tahun).reduce((m, r) => Math.max(m, r.urut || 0), 0) + 1;
  const nomor = ('00' + urut).slice(-3) + '/9.9.9/PERPUS-SRMP9/' + bulan + '/' + tahun;
  const status = STATUS.indexOf(d.status) >= 0 ? d.status : 'Draf';
  const now = new Date().toISOString();
  const row = {
    id: tahun + '-' + ('00' + urut).slice(-3), urut, tahun, bulan, tanggal, nomor,
    jenis: bersih_(d.jenis, 80), perihal: bersih_(d.perihal), tujuan: bersih_(d.tujuan, 200),
    penandatangan: bersih_(d.penandatangan, 120) || 'Kepala Perpustakaan', status,
    arsip: bersih_(d.arsip, 200), catatan: bersih_(d.catatan), dicatatOleh: bersih_(d.dicatatOleh, 80),
    dibuatPada: now, diubahPada: ''
  };
  const sh = sheet_();
  sh.appendRow(KOLOM.map(k => row[k]));
  sh.getRange(sh.getLastRow(), 5).setNumberFormat('@').setValue(tanggal);
  return { ok: true, data: row };
}

function ubah_(d) {
  const sh = sheet_();
  const ids = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getDisplayValues().map(r => r[0]);
  const i = ids.indexOf(String(d.id));
  if (i < 0) return { ok: false, pesan: 'Catatan surat tidak ditemukan.' };
  const baris = i + 2;
  BOLEH_DIUBAH.forEach(k => {
    if (k in d) {
      let v = bersih_(d[k], k === 'perihal' || k === 'catatan' ? 500 : 200);
      if (k === 'status' && STATUS.indexOf(v) < 0) return;
      sh.getRange(baris, KOLOM.indexOf(k) + 1).setValue(v);
    }
  });
  sh.getRange(baris, KOLOM.indexOf('diubahPada') + 1).setValue(new Date().toISOString());
  return { ok: true };
}
