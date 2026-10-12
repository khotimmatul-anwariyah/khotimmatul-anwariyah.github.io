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
  if (!sh) {
    const pertama = ss.getSheets()[0];
    if (ss.getSheets().length === 1 && pertama.getLastRow() === 0) { sh = pertama; sh.setName(NAMA_SHEET); }
    else sh = ss.insertSheet(NAMA_SHEET);
  }
  sh.getRange(1, 1, 1, JUDUL.length).setValues([JUDUL]).setFontWeight('bold');
  sh.setFrozenRows(1);
  sh.getRange('A:A').setNumberFormat('@'); // id disimpan sebagai teks
  sh.getRange('E:F').setNumberFormat('@'); // tanggal (yyyy-mm-dd) dan nomor surat sebagai teks
  sh.getRange('O:P').setNumberFormat('@'); // waktu dicatat dan diubah sebagai teks
  sh.setColumnWidths(1, 16, 120); sh.setColumnWidth(6, 230); sh.setColumnWidth(8, 300);
  buatRekap_(ss);
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

/** POST {kunci, aksi: 'tambah'|'ubah'|'impor', data} */
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
    if (body.aksi === 'impor') return json_(impor_(d));
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

/** Memindahkan surat yang dicatat di mode sementara (di satu perangkat) ke spreadsheet.
 *  Nomor yang sudah dipakai di spreadsheet tidak ditimpa dan dilaporkan sebagai bentrok. */
function impor_(d) {
  const list = Array.isArray(d.rows) ? d.rows.slice(0, 500) : [];
  const ada = semuaBaris_();
  const ids = {}; ada.forEach(r => ids[r.id] = true);
  const sh = sheet_();
  const now = new Date().toISOString();
  let masuk = 0; const bentrok = [];
  list.forEach(x => {
    const tanggal = bersih_(x.tanggal, 10);
    const urut = Number(x.urut) || 0;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || urut < 1) return;
    const tahun = Number(tanggal.slice(0, 4)), bulan = Number(tanggal.slice(5, 7));
    const id = tahun + '-' + ('00' + urut).slice(-3);
    const nomor = ('00' + urut).slice(-3) + '/9.9.9/PERPUS-SRMP9/' + bulan + '/' + tahun;
    if (ids[id]) { bentrok.push(nomor); return; }
    const row = {
      id, urut, tahun, bulan, tanggal, nomor,
      jenis: bersih_(x.jenis, 80), perihal: bersih_(x.perihal), tujuan: bersih_(x.tujuan, 200),
      penandatangan: bersih_(x.penandatangan, 120) || 'Kepala Perpustakaan',
      status: STATUS.indexOf(x.status) >= 0 ? x.status : 'Draf',
      arsip: bersih_(x.arsip, 200), catatan: bersih_(x.catatan), dicatatOleh: bersih_(x.dicatatOleh, 80),
      dibuatPada: bersih_(x.dibuatPada, 40) || now, diubahPada: bersih_(x.diubahPada, 40)
    };
    sh.appendRow(KOLOM.map(k => row[k]));
    sh.getRange(sh.getLastRow(), 5).setNumberFormat('@').setValue(tanggal);
    ids[id] = true; masuk++;
  });
  return { ok: true, masuk: masuk, bentrok: bentrok };
}

/** Sheet Rekap: jumlah surat per bulan, per status, dan per jenis untuk tahun di sel C3. */
function buatRekap_(ss) {
  if (ss.getSheetByName('Rekap')) return;
  const rk = ss.insertSheet('Rekap');
  const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const JENIS = ['Surat dinas','SOP','Surat keterangan bebas pustaka','Surat undangan','Surat pemberitahuan','Laporan','Lainnya'];
  rk.getRange('B1').setValue('Rekap Agenda Surat Keluar').setFontWeight('bold').setFontSize(14);
  rk.getRange('B3').setValue('Tahun rekap').setFontWeight('bold');
  rk.getRange('C3').setValue(new Date().getFullYear()).setBackground('#FFFF00').setFontWeight('bold');
  rk.getRange('D3').setValue('← ubah tahun di sel kuning').setFontStyle('italic').setFontColor('#5D6876');
  let r = 5;
  const blok = (judul, labels, kol, kriteria) => {
    rk.getRange(r, 2, 1, 2).setValues([[judul, 'Jumlah']]).setFontWeight('bold').setFontColor('#FFFFFF').setBackground('#1F5F8B');
    const awal = r + 1;
    labels.forEach((lab, i) => {
      const baris = awal + i;
      rk.getRange(baris, 2).setValue(lab);
      rk.getRange(baris, 3).setFormula('=COUNTIFS(Agenda!$C$2:$C,$C$3,Agenda!$' + kol + '$2:$' + kol + ',' + kriteria(i, baris) + ')');
    });
    const tot = awal + labels.length;
    rk.getRange(tot, 2).setValue('Total').setFontWeight('bold');
    rk.getRange(tot, 3).setFormula('=SUM(C' + awal + ':C' + (tot - 1) + ')').setFontWeight('bold');
    r = tot + 2;
  };
  blok('Per bulan', BULAN, 'D', i => i + 1);
  blok('Per status', STATUS, 'K', (i, b) => 'B' + b);
  blok('Per jenis dokumen', JENIS, 'G', (i, b) => 'B' + b);
  rk.setColumnWidth(2, 260); rk.setColumnWidth(3, 90);
}
