# Rapor ASTS Otomatis — SRMP 9 Bandung

Aplikasi web untuk menyusun rapor Asesmen Sumatif Tengah Semester (ASTS) dari data Google Sheets atau file Excel, lalu mengunduhnya sebagai PDF.

- Alamat web: https://khotimmatul-anwariyah.github.io/rapor-asts/
- Data siswa diproses di browser pengguna dan tidak disimpan di server.
- Google Sheets: atur Bagikan → Akses umum → "Siapa saja yang memiliki link" (Pelihat), lalu tempel link-nya di aplikasi. Data diperbarui otomatis setiap ±30 detik.
- Pustaka di folder `lib/`: SheetJS 0.18.5, jsPDF 2.5.1, jsPDF-AutoTable 3.8.2.
