# 📊 Portal Ujian Seleksi Kompetensi BPS (Batch III)

Platform ujian online mandiri berbasis web dengan desain **Neobrutalism BPS** untuk **60+ peserta serentak**. Sistem ini menggunakan **Google Spreadsheet sebagai database utama** (bank soal, monitoring peserta *real-time*, log pelanggaran, dan rekap hasil ujian) serta dilengkapi sistem keamanan anti-kecurangan berbasis browser.

---

## 🎯 1. Tujuan & Keunggulan Sistem

1. **Distribusi Soal Dinamis & Acak per Formasi:**
   Soal yang tampil otomatis menyesuaikan antara **Soal Umum (`UMUM`)** dan **Soal Khusus Posisi yang Dilamar** (`Staff Administrasi`, `Publisitas dan Kehumasan`, atau `Asisten Pengelola Keuangan`), lalu diacak (*random shuffle*) untuk setiap peserta.
2. **Mendukung 3 Tipe Soal Sekaligus:**
   - **Pilihan Ganda (`PG`):** Opsi jawaban `A, B, C, D, E`.
   - **Soal Deskripsi (`DESKRIPSI`):** Jawaban uraian/esai panjang.
   - **Soal Praktik (`PRAKTIK`):** Pengumpulan tautan Google Spreadsheet kerja dan/atau unggah file gambar hasil desain (`PNG`/`JPG` terkompresi otomatis).
3. **Smart Anti-Cheat (Deteksi Pindah Tab + Alarm Audio):**
   - Pada soal **Pilihan Ganda (`PG`)**, perpindahan tab atau *minimize* browser akan memicu suara alarm (`AudioContext`) dan mencatat pelanggaran secara *real-time* ke sheet `Log_Pelanggaran`.
   - Pada soal **Deskripsi (`DESKRIPSI`)** dan **Soal Praktik (`PRAKTIK`)**, sistem secara otomatis menonaktifkan alarm pindah tab tanpa menampilkan indikator apa pun di layar peserta.
4. **Live Monitoring Peserta & Sisa Waktu:**
   Begitu peserta menekan tombol **"Mulai Ujian Sekarang"**, identitas beserta sisa waktu dan progres pengerjaan langsung tercatat dan diperbarui secara berkala setiap menit di sheet `Monitoring_Peserta`.
5. **Proteksi 1x Login & Anti-Refresh Curang:**
   Setiap Email dan Nama Lengkap hanya dapat memulai ujian **1 kali** (divalidasi langsung ke sheet `Monitoring_Peserta` dan `Hasil_Ujian`). Sesi ujian juga disimpan otomatis di browser sehingga jika peserta me-*refresh* halaman, sisa waktu tidak dapat di-reset ke 60 menit.
6. **Desain Neobrutalism Khas BPS:**
   Menggunakan kombinasi warna resmi Badan Pusat Statistik — **Biru (`#00AEEF`)**, **Hijau (`#8CC63F`)**, dan **Oranye (`#F7941D`)** — dengan tata letak yang bersih dan fokus pada pengerjaan soal.

---

## 🛠️ 2. Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS v4 (Tema Neobrutalism BPS)
- **Database & Penyimpanan:** Google Sheets API v4 (`googleapis` dengan autentikasi `JWT` Service Account)
- **Deployment:** Vercel (Serverless)

---

## 📁 3. Struktur Direktori Utama

- [`src/types/exam.ts`](src/types/exam.ts) — Definisi tipe data TypeScript (`Soal`, `TipeSoal`, `DataPraktik`, `SavedExamSession`).
- [`src/constants/exam.ts`](src/constants/exam.ts) — Konstanta terpusat (durasi ujian, daftar formasi posisi, opsi huruf, dan nama sheet Google Spreadsheet).
- [`src/utils/examHelper.ts`](src/utils/examHelper.ts) — Fungsi utilitas murni (parser baris soal Google Sheets, pencocokan posisi, pengacakan *Fisher-Yates*, dan pemformatan waktu).
- [`src/utils/mediaHelper.ts`](src/utils/mediaHelper.ts) — Fungsi Web Audio API untuk alarm pelanggaran dan kompresi gambar desain di sisi klien.
- [`src/components/exam/`](src/components/exam/) — Komponen antarmuka modular:
  - [`LoginView.tsx`](src/components/exam/LoginView.tsx) — Halaman registrasi/login peserta.
  - [`ExamHeader.tsx`](src/components/exam/ExamHeader.tsx) — Header identitas peserta, *countdown timer*, dan tombol kumpul.
  - [`QuestionCard.tsx`](src/components/exam/QuestionCard.tsx) — Kartu soal dinamis (Pilihan Ganda, Deskripsi, dan Praktik Spreadsheet/Desain).
  - [`QuestionNavigationMap.tsx`](src/components/exam/QuestionNavigationMap.tsx) — Peta navigasi nomor soal yang dapat disembunyikan (*hide/show*).
  - [`ViolationModal.tsx`](src/components/exam/ViolationModal.tsx) — Modal peringatan saat peserta berpindah tab.
  - [`FinishedView.tsx`](src/components/exam/FinishedView.tsx) — Halaman bukti pengumpulan jawaban peserta.
- [`src/lib/googleSheets.ts`](src/lib/googleSheets.ts) — Koneksi dan autentikasi JWT Google Sheets API.
- [`src/app/api/soal/route.ts`](src/app/api/soal/route.ts) — Endpoint `GET` untuk membaca bank soal dari sheet `Soal`.
- [`src/app/api/start/route.ts`](src/app/api/start/route.ts) — Endpoint `POST` & `PUT` untuk validasi 1x ujian dan *live monitoring* di sheet `Monitoring_Peserta`.
- [`src/app/api/monitoring/route.ts`](src/app/api/monitoring/route.ts) — Endpoint `GET` untuk mengambil rekapitulasi sisa waktu, progres soal, dan pelanggaran seluruh peserta secara *real-time*.
- [`src/app/api/log/route.ts`](src/app/api/log/route.ts) — Endpoint `POST` untuk mencatat kecurangan pindah tab ke sheet `Log_Pelanggaran`.
- [`src/app/api/submit/route.ts`](src/app/api/submit/route.ts) — Endpoint `POST` untuk menyimpan rekap jawaban ke tab posisi terkait.
- [`src/app/page.tsx`](src/app/page.tsx) — Kontainer utama pengelola *state* dan alur ujian peserta.
- [`src/app/monitoring/page.tsx`](src/app/monitoring/page.tsx) — Halaman Dashboard Monitoring Admin (`/monitoring`) untuk melihat sisa waktu dan progres soal (`X / Y Soal`) tiap peserta secara *live*.

---

## 📋 4. Struktur Sheet di Google Spreadsheet

Pastikan Google Spreadsheet Anda telah dibagikan (*Share* sebagai **Editor**) ke alamat email Service Account (`GOOGLE_CLIENT_EMAIL`).

### 1. Sheet `Soal`
| Kolom | Nama Kolom | Keterangan Pengisian |
| :--- | :--- | :--- |
| **A** | Kategori / Posisi | Isi `UMUM` (untuk semua peserta) atau nama posisi (`Staff Administrasi`, `Publisitas dan Kehumasan`, `Asisten Pengelola Keuangan`). |
| **B** | Pertanyaan | Teks soal yang akan ditampilkan. |
| **C – G** | Opsi A – E | Isi pilihan jawaban A s/d E untuk soal Pilihan Ganda. Kosongkan untuk soal Deskripsi atau Praktik. |
| **H** | Kunci / Tipe Soal | Isi kunci huruf (`A`/`B`/`C`/`D`/`E`) untuk PG, atau tulis `DESKRIPSI` / `PRAKTIK` untuk soal uraian dan praktik. |

### 2. Sheet `Monitoring_Peserta` *(Dibuat Otomatis)*
Mencatat peserta segera setelah menekan tombol **Mulai Ujian Sekarang**:
`Nama Peserta | Email | Posisi Dilamar | Alamat Domisili | Waktu Mulai | Batas Selesai | Sisa Waktu | Progress Jawaban | Status Ujian`

### 3. Sheet `Log_Pelanggaran`
Mencatat aktivitas pindah tab pada soal non-praktik:
`Waktu Kejadian | Nama Peserta (Posisi) | Jenis Pelanggaran`

### 4. Sheet Jawaban Terpisah per Posisi (`Jawaban_Administrasi`, `Jawaban_Kehumasan`, `Jawaban_Keuangan`) *(Dibuat Otomatis)*
Saat peserta menyelesaikan ujian, seluruh jawaban yang ia kerjakan (baik soal `UMUM` maupun soal khusus posisinya) otomatis masuk ke tab yang sesuai dengan **Posisi yang dipilih saat Login**:
- Pelamar **Staff Administrasi** → masuk ke tab **`Jawaban_Administrasi`**
- Pelamar **Publisitas dan Kehumasan** → masuk ke tab **`Jawaban_Kehumasan`**
- Pelamar **Asisten Pengelola Keuangan** → masuk ke tab **`Jawaban_Keuangan`**

Susunan kolom di masing-masing tab (isi sel di bawah kolom soal murni berisi jawaban peserta):
`Waktu Selesai | Nama Peserta | Email | Posisi Dilamar | Alamat Domisili | Total Pelanggaran | Sisa Waktu | Soal 1 (UMUM) | Soal 2 (...) | ...`

### Cara Menjalankan Build Production Secara Lokal:
```bash
npm run build
npm run start
```

### Cara Deploy ke Vercel:
1. Push repository ini ke **GitHub** (file `.env.local` otomatis diabaikan oleh `.gitignore` sehingga kunci rahasia aman).
2. Buka [https://vercel.com/new](https://vercel.com/new) dan *Import* repository GitHub Anda.
3. Pada bagian **Environment Variables**, masukkan ke-4 variabel di atas (`GOOGLE_SHEET_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, dan `ADMIN_PIN`).
4. Klik **Deploy**.
   - Halaman Ujian Peserta: `https://nama-domain-anda.vercel.app/`
   - Halaman Monitoring Admin: `https://nama-domain-anda.vercel.app/monitoring` (Login menggunakan `ADMIN_PIN`).
