# Agenda Surat Keluar — Perpustakaan Rona Ilmu SRMP 9 Bandung

Web pencatatan surat dan dokumen keluar perpustakaan yang tersinkron dengan **Google Spreadsheet**.

- Surat yang diinput di web langsung tersimpan sebagai baris baru di sheet **Agenda**.
- Surat yang dicatat petugas lain dan perubahan langsung di spreadsheet tampil di semua perangkat dalam ±8 detik.
- Nomor surat dibuat otomatis dengan format `001/9.9.9/PERPUS-SRMP9/10/2026`.
  - Bulan ditulis dengan angka biasa, bukan angka Romawi.
  - Nomor urut dimulai lagi dari 001 setiap tahun.
- Web hanya bisa dibuka dengan **kunci akses** dari Kepala Perpustakaan.
- Setiap nomor surat punya tombol **PDF** (bukti penomoran bertanda tangan Kepala Perpustakaan) dan **Excel** (keterangan surat). Di HP ada tombol **Bagikan** untuk mengirim PDF lewat WhatsApp atau email.
- Tombol **Unduh Excel** dan **Unduh PDF** di bagian atas mengunduh daftar agenda sesuai filter yang dipilih.
- Nama dan NIP penanda tangan PDF diatur di bagian **PENGATURAN** (`KEPALA_NAMA`, `KEPALA_NIP`).

## Isi paket

| File | Fungsi |
|---|---|
| `index.html` | Web agenda surat keluar. Bisa dibuka langsung di browser atau dipasang di GitHub Pages. |
| `Template_Agenda_Surat_Keluar.xlsx` | Template spreadsheet: sheet Petunjuk, Agenda (tempat data), dan Rekap (jumlah surat per bulan, status, dan jenis). |
| `Code.gs` | Skrip penghubung antara web dan spreadsheet (ditempel di Apps Script). |
| `logo.png` | Logo Perpustakaan Rona Ilmu. |

## Langkah pemasangan (±10 menit)

### 1. Pasang template spreadsheet

1. Unggah `Template_Agenda_Surat_Keluar.xlsx` ke Google Drive perpustakaan.
2. Buka file tersebut, lalu pilih **File → Simpan sebagai Google Spreadsheet**.
3. Salin alamat spreadsheet dari address bar browser. Alamat ini dipakai untuk tombol "Buka spreadsheet".

### 2. Pasang skrip penghubung

1. Di Google Spreadsheet tadi, pilih **Ekstensi → Apps Script**.
2. Hapus isi editor, lalu tempel seluruh isi `Code.gs`.
3. Pada baris `const KUNCI_AWAL = 'ganti-dengan-kunci-rahasia';`, ganti teks di antara tanda kutip dengan kunci akses pilihan perpustakaan.
4. Simpan, pilih fungsi **siapkan**, lalu tekan **Jalankan**. Izinkan akses saat diminta.
5. Pilih **Terapkan → Deployment baru**:
   - Jenis: **Aplikasi web**
   - Jalankan sebagai: **Saya**
   - Yang memiliki akses: **Siapa saja**
6. Tekan **Terapkan**, lalu salin **URL aplikasi web** yang berakhiran `/exec`.

### 3. Sambungkan web (tanpa mengedit kode)

1. Buka web agenda, lalu klik **Sambungan spreadsheet**.
2. Tempel **URL aplikasi web** (berakhiran `/exec`) di kolom pertama. Link Google Spreadsheet boleh diisi di kolom kedua untuk tombol "Buka spreadsheet".
3. Klik **Uji & simpan**. Jika berhasil, muncul **Tautan untuk petugas lain**. Klik **Salin**, lalu kirim tautan itu ke petugas (misalnya lewat WhatsApp).
4. Klik **Mulai gunakan**, lalu masuk dengan nama dan kunci akses.
5. Jika sebelumnya ada surat yang dicatat di mode sementara, klik **Kirim ke spreadsheet** pada pemberitahuan yang muncul.

Petugas lain cukup membuka tautan tersebut sekali di perangkat mereka. Sambungan langsung tersimpan, lalu mereka masuk dengan nama dan kunci akses.

Cara lain: isi `API_URL` dan `SHEET_URL` di bagian **PENGATURAN** pada `index.html`. Dengan cara ini semua perangkat otomatis tersambung tanpa tautan khusus.

### 4. (Opsional) Pasang di GitHub Pages agar punya alamat web

1. Unggah `index.html` dan `logo.png` ke repositori GitHub lewat **Add file → Upload files**.
2. Buka **Settings → Pages**. Pilih **Deploy from a branch**, branch **main**, folder **/ (root)**, lalu **Save**.
3. Tunggu 1–2 menit. Alamat web akan muncul, misalnya `https://namaakun.github.io/nama-repo/`.

### 5. Bagikan ke petugas

Kirim alamat web (atau file `index.html`) dan kunci akses kepada petugas. Saat pertama membuka web, petugas mengisi nama dan kunci akses, lalu halaman mengingatnya di perangkat tersebut.

## Aturan pengisian

- **Surat baru dicatat lewat web**, bukan langsung di spreadsheet, agar nomor urut tidak kembar.
- **Kolom otomatis**: ID, No. Urut, Tahun, Bulan, Tanggal, Nomor Surat, Dicatat Oleh, Dibuat Pada, dan Diubah Pada diisi otomatis. Jangan diubah manual.
- **Kolom yang boleh diperbaiki di spreadsheet**: Jenis Dokumen, Perihal, Tujuan, Penandatangan, Status, Lokasi Arsip, dan Catatan.
- **Surat yang batal dikirim** diberi status **Dibatalkan**, tidak dihapus.
- **Sheet Rekap**: ubah tahun di sel kuning untuk melihat jumlah surat tahun lain.

## Catatan keamanan

- Jangan menulis kunci akses di `index.html` atau di GitHub. Kunci hanya disimpan di Apps Script.
- **Mengganti kunci**: ubah `KUNCI_AWAL`, lalu jalankan lagi fungsi **siapkan**. Data yang sudah ada tidak terhapus.
- **Jika `Code.gs` diperbarui** (misalnya versi yang mendukung "Kirim ke spreadsheet"): pilih **Terapkan → Kelola deployment → Edit → Versi baru** agar URL tetap sama.
