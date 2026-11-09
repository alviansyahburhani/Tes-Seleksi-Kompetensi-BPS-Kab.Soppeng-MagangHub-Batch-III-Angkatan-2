<div align="center">

# 🎯 Sistem Ujian Seleksi Kompetensi (CAT)

### Badan Pusat Statistik (BPS) Kabupaten Soppeng

**Computer Assisted Test berbasis web yang aman, terpantau real-time, dan tahan beban**
untuk Tes Seleksi Kompetensi peserta **MagangHub Batch III Angkatan 2**

<br/>

![Next.js](https://img.shields.io/badge/Next.js-App_Router-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-UI-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Styling-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Google Sheets](https://img.shields.io/badge/Google_Sheets-Database-34A853?style=for-the-badge&logo=googlesheets&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-%E2%89%A5_18.17-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)

[✨ Fitur](#-fitur-utama) •
[🏗️ Arsitektur](#️-arsitektur-sistem) •
[🛡️ Anti-Cheat](#️-sistem-keamanan--integritas-anti-cheat) •
[🚀 Instalasi](#-panduan-instalasi-cepat) •
[📡 API](#-referensi-api) •
[❓ FAQ](#-faq--pemecahan-masalah)

</div>

---

## 📖 Tentang Proyek

Aplikasi ini adalah **platform ujian daring (CAT)** yang dibangun khusus untuk menyelenggarakan Tes Seleksi Kompetensi di lingkungan **BPS Kabupaten Soppeng**. Dirancang dengan tiga prinsip utama:

| Prinsip | Penjelasan |
|---|---|
| 🔒 **Terstruktur & Aman** | Validasi sesi, pencegahan login ganda, kunci jawaban tidak pernah dikirim ke peserta, dan skor dihitung di sisi server. |
| 👁️ **Terpantau Real-Time** | Pengawas dapat melihat status, progres, dan pelanggaran setiap peserta secara langsung, lengkap dengan alarm suara. |
| ⚡ **Stabil Saat Serentak** | *Server-side in-memory caching* menjaga kuota Google Sheets API tetap aman ketika puluhan peserta mengakses bersamaan. |

> 💡 **Mengapa Google Sheets sebagai database?**
> Mudah dikelola panitia non-teknis (soal, peserta, dan hasil bisa dilihat langsung di spreadsheet), tanpa biaya infrastruktur database, dan cepat disiapkan menjelang hari pelaksanaan.

---

## ✨ Fitur Utama

### 👨‍🎓 1. Modul Peserta Ujian

| Halaman | Rute | Fungsi |
|---|---|---|
| 🔑 **Login** | `/login` | Memverifikasi identitas peserta dan mencegah akses ganda pada sesi yang sedang berlangsung. |
| 🛋️ **Lobby** | `/lobby` | Menampilkan data peserta, petunjuk teknis, dan **Pakta Integritas** sebelum ujian dimulai. |
| 📝 **Ujian** | `/ujian` | Lembar kerja CAT utama dengan seluruh fitur interaktif di bawah. |
| 📢 **Pengumuman** | `/pengumuman` | Portal hasil akhir seleksi kompetensi. |

**Fitur pada antarmuka ujian (`/ujian`):**

- 🧭 **Navigasi nomor soal interaktif** dengan tiga status warna:
  - 🟢 Sudah dijawab
  - 🟡 Ragu-ragu
  - ⚪ Belum dijawab
- ⏱️ **Countdown timer tersinkronisasi server** — waktu mulai dicatat di server sehingga refresh atau pindah perangkat tidak mereset waktu.
- 🧮 **Perenderan rumus & notasi matematika** melalui komponen `MathText`.
- 🖼️ **Soal berbasis gambar** — mendukung tabel statistik, nota, hingga draf surat.
- 🤖 **Auto-submit** — jawaban otomatis dikumpulkan saat waktu habis.
- ⚠️ **Modal peringatan** untuk soal yang belum dijawab sebelum konfirmasi akhir.

### 🛡️ 2. Sistem Keamanan & Integritas (Anti-Cheat)

- 🕵️ **Deteksi perpindahan fokus & tab** — mendeteksi peserta yang keluar halaman, berpindah tab, atau membuka aplikasi lain.
- 🚨 **Pencatatan pelanggaran otomatis** — setiap pelanggaran memunculkan modal peringatan di layar peserta dan langsung tersimpan ke database lengkap dengan *timestamp*.

### 📡 3. Modul Pengawasan Real-Time (`/monitoring`)

- 📊 **Dashboard proctoring** — daftar seluruh peserta, status pengerjaan, progres soal, dan jumlah pelanggaran secara langsung.
- 🔔 **Alarm & notifikasi pelanggaran** — alarm suara otomatis (`alarm.wav`) dan alert visual di layar pengawas begitu ada pelanggaran.

---

## 🏗️ Arsitektur Sistem

```mermaid
flowchart LR
    subgraph Client["🖥️ Browser"]
        P["👨‍🎓 Peserta<br/>/login → /lobby → /ujian"]
        M["👮 Pengawas<br/>/monitoring"]
    end

    subgraph Server["⚙️ Next.js App Router"]
        API["API Routes<br/>start · soal · log · submit · monitoring"]
        SEC["🔐 security.ts"]
        CACHE["⚡ sheetsCache.ts<br/>In-Memory Cache"]
        VAS["🔔 violationAlertStore.ts"]
    end

    GS[("📗 Google Sheets<br/>Database")]

    P --> API
    M --> API
    API --> SEC
    API --> CACHE
    API --> VAS
    CACHE <--> GS
```

### 🔄 Alur Peserta

```mermaid
sequenceDiagram
    autonumber
    actor Peserta
    participant App as Next.js
    participant Sheet as Google Sheets

    Peserta->>App: Login (/api/start)
    App->>Sheet: Validasi kredensial & catat waktu mulai
    App-->>Peserta: Sesi aktif
    Peserta->>App: Ambil soal (/api/soal)
    App-->>Peserta: Soal dari cache (tanpa kunci jawaban)
    loop Selama ujian
        Peserta->>App: Pelanggaran terdeteksi (/api/log)
        App->>Sheet: Simpan log + timestamp
    end
    Peserta->>App: Submit / waktu habis (/api/submit)
    App->>Sheet: Hitung skor di server & simpan hasil
    App-->>Peserta: Tampilan selesai
```

---

## 🧰 Teknologi yang Digunakan

| Kategori | Teknologi |
|---|---|
| 🧱 Framework | **Next.js** (App Router) |
| 💻 Bahasa | **TypeScript** |
| 🎨 UI & Styling | **React**, **Tailwind CSS** |
| 🗄️ Database | **Google Sheets API** (`googleapis`) + In-Memory Server Cache |
| 🔧 Utilitas | `MathText` (render rumus kustom), **Web Audio API** (alarm pengawas) |

---

## 📂 Struktur Direktori

```text
├── public/                              # Aset statis (logo BPS, audio alarm, gambar instrumen soal)
├── src/
│   ├── app/                             # Routing halaman & API (App Router)
│   │   ├── api/
│   │   │   ├── log/route.ts             # Pencatatan log pelanggaran peserta
│   │   │   ├── monitoring/route.ts      # Data pantauan untuk pengawas
│   │   │   ├── soal/route.ts            # Distribusi soal ujian
│   │   │   ├── start/route.ts           # Inisialisasi waktu mulai ujian
│   │   │   └── submit/route.ts          # Pengumpulan jawaban & kalkulasi skor
│   │   ├── lobby/page.tsx               # Ruang tunggu peserta
│   │   ├── login/page.tsx               # Login peserta
│   │   ├── monitoring/page.tsx          # Dashboard pengawas
│   │   ├── pengumuman/page.tsx          # Pengumuman hasil seleksi
│   │   ├── ujian/page.tsx               # Lembar kerja ujian utama
│   │   └── page.tsx                     # Landing / redirect
│   ├── components/exam/                 # Komponen UI khusus ujian
│   │   ├── ConfirmSubmitModal.tsx       # Konfirmasi penyelesaian ujian
│   │   ├── ExamHeader.tsx               # Info peserta & countdown timer
│   │   ├── FinishedView.tsx             # Tampilan setelah ujian selesai
│   │   ├── LoginView.tsx                # Formulir login
│   │   ├── MathText.tsx                 # Perender rumus matematika
│   │   ├── ParticipantLobbyView.tsx     # Ruang tunggu & tata tertib
│   │   ├── QuestionCard.tsx             # Kartu soal & opsi pilihan ganda
│   │   ├── QuestionNavigationMap.tsx    # Panel navigasi nomor soal
│   │   ├── UnansweredModal.tsx          # Peringatan soal belum dijawab
│   │   └── ViolationModal.tsx           # Peringatan pelanggaran ujian
│   ├── constants/exam.ts                # Konfigurasi ujian (durasi, batas pelanggaran, dll.)
│   ├── lib/                             # Logika inti sisi server
│   │   ├── googleSheets.ts              # Koneksi & operasi baca/tulis Google Sheets
│   │   ├── security.ts                  # Validasi keamanan & otorisasi request
│   │   ├── sheetsCache.ts               # Cache memori untuk efisiensi kuota API
│   │   └── violationAlertStore.ts       # Antrean peringatan pelanggaran real-time
│   ├── types/exam.ts                    # Definisi tipe TypeScript
│   └── utils/
│       ├── examHelper.ts                # Format waktu, olah soal, evaluasi
│       └── mediaHelper.ts               # Pengendali audio alarm dashboard monitoring
├── next.config.ts                       # Konfigurasi Next.js
├── package.json                         # Dependensi & skrip NPM
└── tsconfig.json                        # Konfigurasi TypeScript
```

---

## 🚀 Panduan Instalasi Cepat

### ✅ Prasyarat

- [ ] **Node.js** versi `18.17` atau lebih baru
- [ ] **npm**, **yarn**, atau **pnpm**
- [ ] **Google Cloud Service Account** dengan akses **Editor** ke Google Sheets yang dipakai sebagai database

### 1️⃣ Kloning Repositori

```bash
git clone https://github.com/alviansyahburhani/tes-seleksi-kompetensi-bps-kab.soppeng-maganghub-batch-iii-angkatan-2.git
cd tes-seleksi-kompetensi-bps-kab.soppeng-maganghub-batch-iii-angkatan-2
```

### 2️⃣ Instal Dependensi

```bash
npm install
```

### 3️⃣ Siapkan Google Sheets & Service Account

1. Buka [Google Cloud Console](https://console.cloud.google.com/) dan buat atau pilih sebuah project.
2. Aktifkan **Google Sheets API**.
3. Buat **Service Account**, lalu unduh kuncinya dalam format **JSON**.
4. Buka Google Spreadsheet Anda, klik **Bagikan**, dan tambahkan email service account sebagai **Editor**.
5. Salin **ID Spreadsheet** dari URL:
   `https://docs.google.com/spreadsheets/d/`**`ID_SPREADSHEET_ANDA`**`/edit`

> 📌 Struktur sheet/tab yang dibutuhkan mengikuti konfigurasi pada `src/lib/googleSheets.ts`. Sesuaikan nama tab dan kolom di spreadsheet dengan file tersebut.

### 4️⃣ Konfigurasi Environment Variables

Buat file `.env.local` di root proyek:

```env
# 🔑 Kredensial Google Service Account
GOOGLE_SHEETS_CLIENT_EMAIL="service-account-anda@project-id.iam.gserviceaccount.com"
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# 📗 ID Dokumen Google Spreadsheet
GOOGLE_SPREADSHEET_ID="id_spreadsheet_anda"

# 🛡️ Keamanan Aplikasi (sesuaikan dengan src/lib/security.ts)
ADMIN_MONITORING_KEY="kunci_akses_monitoring"
SESSION_SECRET="kunci_rahasia_sesi"
```

| Variabel | Fungsi |
|---|---|
| `GOOGLE_SHEETS_CLIENT_EMAIL` | Email service account Google Cloud |
| `GOOGLE_SHEETS_PRIVATE_KEY` | Private key service account (pertahankan `\n` apa adanya) |
| `GOOGLE_SPREADSHEET_ID` | ID spreadsheet yang menjadi database |
| `ADMIN_MONITORING_KEY` | Kunci akses untuk membuka dashboard pengawas |
| `SESSION_SECRET` | Rahasia penandatanganan/validasi sesi peserta |

> ⚠️ **Jangan pernah meng-commit `.env.local` ke repositori publik.** Gunakan nilai acak yang panjang untuk `SESSION_SECRET` dan `ADMIN_MONITORING_KEY`.

### 5️⃣ Jalankan Aplikasi

**Mode pengembangan:**

```bash
npm run dev
```

Buka 👉 [http://localhost:3000](http://localhost:3000)

**Mode produksi:**

```bash
npm run build
npm run start
```

---

## 📡 Referensi API

| Endpoint | Metode | Deskripsi |
|---|:---:|---|
| `/api/start` | `POST` | Memvalidasi kredensial peserta dan mencatat waktu mulai sesi ke Google Sheets. |
| `/api/soal` | `GET` | Mengambil daftar soal melalui cache server, **tanpa kunci jawaban**. |
| `/api/log` | `POST` | Mencatat pelanggaran peserta dan memicu notifikasi di halaman pengawas. |
| `/api/submit` | `POST` | Menerima jawaban akhir, menghitung skor di server, dan menyimpan hasil. |
| `/api/monitoring` | `GET` | Menyajikan progres peserta real-time dan daftar peringatan untuk pengawas. |

---

## 🔐 Catatan Keamanan

- ✅ Kunci jawaban **tidak pernah dikirim** ke browser peserta.
- ✅ Skor dihitung **sepenuhnya di server** pada `/api/submit`.
- ✅ Waktu ujian bersumber dari **waktu mulai di server**, bukan dari jam perangkat peserta.
- ✅ Dashboard pengawas dilindungi **kunci akses admin**.
- ✅ Kredensial disimpan di **environment variable**, bukan di kode sumber.

---

## 🧪 Checklist Hari-H Ujian

- [ ] Spreadsheet sudah berisi data peserta dan bank soal terbaru
- [ ] Service account sudah menjadi **Editor** pada spreadsheet
- [ ] Konstanta di `src/constants/exam.ts` (durasi, batas pelanggaran) sudah sesuai
- [ ] Uji coba login, mulai ujian, pelanggaran, dan submit dengan akun uji
- [ ] Dashboard `/monitoring` terbuka di perangkat pengawas dan **volume alarm menyala**
- [ ] Browser pengawas sudah mengizinkan pemutaran audio otomatis
- [ ] Koneksi internet server dan lokasi ujian sudah dicek
- [ ] Aplikasi berjalan dalam mode produksi (`npm run build && npm run start`)

---

## ❓ FAQ & Pemecahan Masalah

<details>
<summary><b>🔸 Error <code>invalid_grant</code> / gagal autentikasi Google</b></summary>

Pastikan `GOOGLE_SHEETS_PRIVATE_KEY` ditulis dalam satu baris dengan karakter `\n` utuh, diapit tanda kutip, dan email service account sudah ditambahkan sebagai Editor pada spreadsheet.
</details>

<details>
<summary><b>🔸 Muncul error kuota (429 / quota exceeded) dari Google Sheets</b></summary>

Aplikasi memakai cache server untuk menekan jumlah permintaan. Pastikan aplikasi berjalan sebagai **satu instance** yang stabil, karena cache disimpan di memori proses dan tidak dibagi antarinstance.
</details>

<details>
<summary><b>🔸 Alarm di dashboard pengawas tidak berbunyi</b></summary>

Browser umumnya memblokir audio otomatis sebelum ada interaksi pengguna. Klik sekali di halaman `/monitoring` setelah dibuka, lalu pastikan volume perangkat menyala.
</details>

<details>
<summary><b>🔸 Peserta tidak bisa login karena dianggap sedang aktif di perangkat lain</b></summary>

Ini adalah mekanisme pencegahan akses ganda. Pengawas dapat memeriksa status sesi peserta pada spreadsheet dan mereset sesi sesuai kebijakan panitia.
</details>

---

## 🗺️ Rencana Pengembangan (Roadmap)

- [ ] 🔀 Pengacakan urutan soal dan opsi jawaban per peserta
- [ ] 📸 Tangkapan layar / bukti visual saat pelanggaran terjadi
- [ ] 📈 Dashboard analitik hasil (rata-rata, distribusi nilai, analisis butir soal)
- [ ] 📥 Ekspor hasil ujian ke PDF/Excel
- [ ] 🌙 Mode gelap pada antarmuka peserta
- [ ] 🗃️ Opsi migrasi ke database relasional untuk skala lebih besar

---

## 🤝 Kontribusi

Saran dan perbaikan sangat diterima.

1. 🍴 Fork repositori ini
2. 🌿 Buat branch fitur: `git checkout -b fitur/nama-fitur`
3. 💾 Commit perubahan: `git commit -m "feat: deskripsi singkat"`
4. 📤 Push ke branch: `git push origin fitur/nama-fitur`
5. 🔃 Buka **Pull Request**

---

## 📜 Lisensi & Hak Cipta

Dikembangkan untuk keperluan pelaksanaan **Tes Seleksi Kompetensi MagangHub Batch III Angkatan 2** — **Badan Pusat Statistik (BPS) Kabupaten Soppeng**.

© Seluruh hak cipta dilindungi.

<div align="center">

<br/>

**Dibuat dengan ❤️ untuk seleksi yang jujur, adil, dan transparan**

⭐ Jika proyek ini bermanfaat, jangan lupa beri bintang pada repositori!

</div>
