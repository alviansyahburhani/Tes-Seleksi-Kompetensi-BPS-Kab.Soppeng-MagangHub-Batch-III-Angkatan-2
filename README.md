Sistem Ujian Seleksi Kompetensi (CAT) — BPS Kabupaten Soppeng

Repositori ini berisi kode sumber aplikasi web Computer Assisted Test (CAT) yang digunakan untuk pelaksanaan Tes Seleksi Kompetensi peserta MagangHub Batch III Angkatan 2 di lingkungan Badan Pusat Statistik (BPS) Kabupaten Soppeng.

Aplikasi ini dirancang untuk menyelenggarakan ujian daring secara terstruktur, aman, dan terpantau secara real-time. Sistem memanfaatkan Next.js (App Router) sebagai kerangka kerja utama dan mengintegrasikan Google Sheets API sebagai basis data terpusat yang didukung oleh mekanisme server-side caching untuk menjaga stabilitas performa saat diakses secara serentak.

Fitur Utama

1. Modul Peserta Ujian

Autentikasi & Validasi Sesi (/login): Memverifikasi identitas peserta dan mencegah akses ganda pada sesi ujian yang sedang berlangsung.

Ruang Tunggu & Pakta Integritas (/lobby): Menampilkan informasi peserta, petunjuk teknis, serta tata tertib ujian sebelum waktu pengerjaan dimulai.

Antarmuka Ujian CAT (/ujian):

Navigasi nomor soal interaktif dengan indikator status pengerjaan (Sudah Dijawab, Ragu-ragu, dan Belum Dijawab).

Penunjuk waktu mundur (countdown timer) yang tersinkronisasi dengan waktu mulai peserta di server.

Dukungan perenderan rumus/notasi matematika serta instrumen soal berbasis gambar (tabel statistik, nota, dan draf surat).

Pengumpulan jawaban otomatis (auto-submit) apabila waktu ujian telah habis.

Portal Pengumuman (/pengumuman): Menyajikan informasi hasil akhir seleksi kompetensi peserta.

2. Sistem Keamanan & Integritas (Anti-Cheat)

Deteksi Perpindahan Fokus & Tab: Memantau aktivitas peramban peserta secara aktif dan mendeteksi upaya keluar dari halaman ujian, berpindah tab, atau membuka aplikasi lain.

Pencatatan Pelanggaran Otomatis: Setiap pelanggaran yang terdeteksi akan memunculkan modal peringatan pada layar peserta dan langsung tercatat ke dalam basis data beserta cap waktunya (timestamp).

3. Modul Pengawasan Real-Time (/monitoring)

Dashboard Proctoring: Menampilkan daftar seluruh peserta, status pengerjaan saat ini, progres soal, dan jumlah pelanggaran secara langsung.

Notifikasi & Alarm Pelanggaran: Dilengkapi sistem peringatan suara otomatis (alarm.wav) dan alert visual di layar pengawas ketika terdapat peserta yang melakukan pelanggaran selama ujian berlangsung.

Teknologi yang Digunakan

Framework: Next.js (App Router)

Bahasa Pemrograman: TypeScript

Antarmuka & Styling: React, Tailwind CSS

Basis Data & Penyimpanan: Google Sheets API (googleapis) dengan dukungan In-Memory Server Cache

Utilitas Tambahan: Perenderan teks matematika kustom (MathText) dan Web Audio API untuk sistem pengawasan

Struktur Direktori

├── public/                              # Aset statis (Logo BPS, audio alarm, dan gambar instrumen soal)
├── src/
│   ├── app/                             # Routing halaman dan API (Next.js App Router)
│   │   ├── api/
│   │   │   ├── log/route.ts             # Endpoint pencatatan log pelanggaran peserta
│   │   │   ├── monitoring/route.ts      # Endpoint pengambilan data pantauan pengawas
│   │   │   ├── soal/route.ts            # Endpoint distribusi soal ujian
│   │   │   ├── start/route.ts           # Endpoint inisialisasi waktu mulai ujian
│   │   │   └── submit/route.ts          # Endpoint pengumpulan jawaban dan kalkulasi skor
│   │   ├── lobby/page.tsx               # Halaman ruang tunggu peserta
│   │   ├── login/page.tsx               # Halaman login peserta
│   │   ├── monitoring/page.tsx          # Halaman dashboard pengawas ujian
│   │   ├── pengumuman/page.tsx          # Halaman pengumuman hasil seleksi
│   │   ├── ujian/page.tsx               # Halaman lembar kerja ujian utama
│   │   └── page.tsx                     # Halaman utama (landing/redirect)
│   ├── components/exam/                 # Komponen antarmuka pengguna (UI) khusus ujian
│   │   ├── ConfirmSubmitModal.tsx       # Modal konfirmasi penyelesaian ujian
│   │   ├── ExamHeader.tsx               # Header informasi peserta dan penghitung waktu mundur
│   │   ├── FinishedView.tsx             # Tampilan setelah peserta menyelesaikan ujian
│   │   ├── LoginView.tsx                # Komponen formulir login
│   │   ├── MathText.tsx                 # Komponen perender rumus matematika
│   │   ├── ParticipantLobbyView.tsx     # Komponen ruang tunggu dan tata tertib
│   │   ├── QuestionCard.tsx             # Komponen kartu soal dan opsi pilihan ganda
│   │   ├── QuestionNavigationMap.tsx    # Panel navigasi nomor soal
│   │   ├── UnansweredModal.tsx          # Modal peringatan soal yang belum dijawab
│   │   └── ViolationModal.tsx           # Modal peringatan pelanggaran ujian
│   ├── constants/exam.ts                # Konstanta konfigurasi ujian (durasi, batas pelanggaran, dll.)
│   ├── lib/                             # Pustaka inti sisi server (Backend Logic)
│   │   ├── googleSheets.ts              # Konfigurasi koneksi dan operasi baca/tulis Google Sheets
│   │   ├── security.ts                  # Fungsi validasi keamanan dan otorisasi request
│   │   ├── sheetsCache.ts               # Manajemen cache memori untuk efisiensi kuota API
│   │   └── violationAlertStore.ts       # Manajemen antrean peringatan pelanggaran real-time
│   ├── types/exam.ts                    # Definisi tipe data TypeScript
│   └── utils/                           # Fungsi bantuan (Helper Functions)
│       ├── examHelper.ts                # Fungsi format waktu, pengolahan soal, dan evaluasi
│       └── mediaHelper.ts               # Fungsi pengendali audio alarm pada dashboard monitoring
├── next.config.ts                       # Konfigurasi Next.js
├── package.json                         # Daftar dependensi dan skrip NPM
└── tsconfig.json                        # Konfigurasi kompilator TypeScript


Panduan Instalasi dan Penggunaan

Prasyarat

Node.js versi 18.17 atau lebih baru.

npm, yarn, atau pnpm.

Akun Google Cloud Service Account yang memiliki akses Editor ke dokumen Google Sheets yang digunakan sebagai basis data.

1. Kloning Repositori

git clone https://github.com/alviansyahburhani/tes-seleksi-kompetensi-bps-kab.soppeng-maganghub-batch-iii-angkatan-2.git
cd tes-seleksi-kompetensi-bps-kab.soppeng-maganghub-batch-iii-angkatan-2


2. Instalasi Dependensi

npm install


3. Konfigurasi Variabel Lingkungan (Environment Variables)

Buat file .env.local pada direktori utama (root) proyek dan sesuaikan variabel berikut dengan kredensial Google Cloud serta pengaturan keamanan Anda:

# Kredensial Google Service Account
GOOGLE_SHEETS_CLIENT_EMAIL="service-account-anda@project-id.iam.gserviceaccount.com"
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# ID Dokumen Google Spreadsheet
GOOGLE_SPREADSHEET_ID="id_spreadsheet_anda"

# Konfigurasi Keamanan Aplikasi (Sesuaikan dengan src/lib/security.ts)
ADMIN_MONITORING_KEY="kunci_akses_monitoring"
SESSION_SECRET="kunci_rahasia_sesi"


4. Menjalankan Aplikasi

Untuk menjalankan server pengembangan (development):

npm run dev


Buka http://localhost:3000 pada peramban Anda untuk melihat hasilnya.

Untuk membangun dan menjalankan aplikasi pada lingkungan produksi (production):

npm run build
npm run start


Ringkasan Endpoint API

Endpoint

Metode

Deskripsi

/api/start

POST

Memvalidasi kredensial peserta dan mencatat waktu mulai sesi ujian ke Google Sheets.

/api/soal

GET

Mengambil daftar soal ujian melalui lapisan cache server tanpa menyertakan kunci jawaban.

/api/log

POST

Mencatat tindakan pelanggaran peserta dan memicu notifikasi pada halaman pengawas.

/api/submit

POST

Menerima jawaban akhir peserta, menghitung skor di sisi server, dan menyimpan hasil ujian.

/api/monitoring

GET

Menyajikan data progres peserta secara real-time dan daftar peringatan untuk pengawas.

Lisensi & Hak Cipta

Dikembangkan untuk keperluan pelaksanaan Tes Seleksi Kompetensi MagangHub Batch III Angkatan 2 — Badan Pusat Statistik (BPS) Kabupaten Soppeng. Seluruh hak cipta dilindungi.
