# 📋 Blueprint & Planning Fitur Baru: Alur 2 Tahap (Tes Seleksi Kompetensi & Tes Wawancara)

Dokumen ini berisi rancangan arsitektur dan alur kerja pembaruan sistem **Seleksi Kompetensi MagangHub BPS Kab. Soppeng Batch III** yang mengintegrasikan **Registrasi Kehadiran**, **Tes Seleksi Kompetensi**, dan **Tes Wawancara** beserta **Panel Approve Admin**.

---

## 🎯 1. Tujuan Utama Fitur Baru

1. **Satu Pintu Registrasi Kehadiran di Awal:**
   Peserta yang baru tiba di lokasi cukup mengisi form identitas (`Nama Lengkap`, `Email Aktif`, `Posisi yang Dilamar`, dan `Alamat Domisili`) satu kali untuk tercatat hadir di sheet `Monitoring_Peserta`.
2. **Pop-up Alur & Ketentuan Seleksi Setelah Daftar Hadir:**
   Setelah mengisi daftar hadir, muncul pop-up **Alur & Ketentuan Ujian** yang menjelaskan 2 tahapan seleksi (Tes Kompetensi & Tes Wawancara). Peserta wajib mencentang *checkbox* persetujuan untuk melanjutkan ke Lobby Seleksi.
3. **Pengaturan Dua Alur Bolak-Balik Otomatis (Lobby Peserta):**
   - **Jika peserta mengikuti Wawancara terlebih dahulu** dan sudah di-*approve* Admin → Peserta tidak dapat mengikuti wawancara lagi dan otomatis diarahkan untuk mengikuti **Tes Seleksi Kompetensi**.
   - **Jika peserta mengikuti Tes Seleksi Kompetensi terlebih dahulu** dan sudah mengumpulkan jawaban → Peserta tidak dapat mengikuti tes kompetensi lagi dan otomatis diarahkan untuk mengikuti **Tes Wawancara**.
   - **Jika kedua tahap telah selesai (`Kompetensi SELESAI` + `Wawancara APPROVED`)** → Peserta mendapatkan pemberitahuan bahwa seluruh rangkaian seleksi telah tuntas.
4. **Kontrol Akses Ujian Kompetensi & Timer Akurat:**
   - Peserta hanya bisa masuk ke soal ujian setelah Admin memberikan **Approve Akses Kompetensi** di halaman `/monitoring`.
   - **Waktu ujian (60 Menit) TIDAK berjalan saat di-approve Admin**, melainkan **baru mulai berjalan saat peserta menekan tombol `"Mulai Ujian Sekarang"`** di layar mereka.
5. **Penambahan Sidebar Approve di `/monitoring` (Tanpa Mengubah Tabel Monitoring yang Sudah Ada):**
   - Tampilan tabel utama **Monitoring Ujian** yang sudah ada sekarang tetap dipertahankan 100%.
   - Ditambahkan **Sidebar Navigasi** di halaman `/monitoring` untuk mengakses menu **Approve Tes Kompetensi** dan **Approve Tes Wawancara**.

---

## 🗺️ 2. Detail Alur Pengguna (User Flow)

```mermaid
flowchart TD
    A["Peserta Datang & Buka Web"] --> B["Isi Form Kehadiran\n(Nama, Email, Posisi, Alamat)"]
    B --> C["Tercatat Hadir di Monitoring_Peserta"]
    C --> D["Muncul Pop-up Alur & Ketentuan Ujian\n(Wajib Centang Checkbox + Klik Setuju)"]
    D --> E["Masuk ke Lobby Status Seleksi Peserta"]

    E --> F{"Cek Status Kedua Tahap"}

    F -->|"Kompetensi: Menunggu Approve"| G["Tombol Mulai Ujian Terkunci\n(Menunggu Approve Admin Kompetensi)"]
    F -->|"Kompetensi: Di-Approve Admin"| H["Tombol 'Mulai Ujian Sekarang' Terbuka\n(Timer 60 Menit Jalan Saat Diklik Peserta)"] ya
    H --> I["Kerjakan Soal & Kumpul Jawaban"]
    I --> J["Kompetensi Terkunci (Selesai)\nDiarahkan Mengikuti Tes Wawancara"]

    F -->|"Wawancara: Belum / Menunggu"| K["Status Wawancara: Menunggu Approve Admin"]
    F -->|"Wawancara: Di-Approve Admin"| L["Wawancara Terkunci (Selesai)\nDiarahkan Mengikuti Tes Kompetensi"]

    J --> M{"Keduanya Selesai?"}
    L --> M
    M -->|"Ya"| N["🎉 Seluruh Tahap Seleksi Selesai"]
```

---

## 📊 3. Struktur Data di Sheet `Monitoring_Peserta`

Tidak perlu menambah tab/sheet baru agar **tetap hemat kuota Google Sheets API**. Cukup menggunakan baris peserta pada sheet **`Monitoring_Peserta`** (`Kolom A` s/d `Kolom J`):

| Kolom | Nama Header | Nilai / Status yang Disimpan |
| :---: | :--- | :--- |
| **A** | `Nama Peserta` | Nama lengkap peserta |
| **B** | `Email` | Email aktif peserta (digunakan juga untuk pencocokan sesi) |
| **C** | `Posisi Dilamar` | `Staff Administrasi` / `Publisitas dan Kehumasan` / `Asisten Pengelola Keuangan` |
| **D** | `Alamat Domisili` | Alamat lengkap peserta |
| **E** | `Waktu Mulai` | `-` (saat baru hadir) → diisi jam mulai saat peserta klik **Mulai Ujian Sekarang** |
| **F** | `Batas Selesai` | `-` (saat baru hadir) → diisi jam batas selesai (`Waktu Mulai + 60 Menit`) |
| **G** | `Sisa Waktu` | `60:00` (saat belum mulai) → hitung mundur `MM:SS` saat ujian berjalan |
| **H** | `Progress Jawaban` | `0 / Y Soal` → terupdate saat jumlah soal terjawab berubah |
| **I** | `Status Ujian` | • `HADIR - MENUNGGU AKSES` *(Saat baru isi daftar hadir)*<br>• `SIAP UJIAN (APPROVED)` *(Saat Admin meng-approve akses tes kompetensi, timer belum jalan)*<br>• `SEDANG MENGERJAKAN` *(Saat peserta klik Mulai Ujian, timer 60 menit berjalan)*<br>• `SELESAI (Waktu)` *(Saat peserta telah mengumpulkan jawaban ujian)* |
| **J** | `Status Wawancara` | • `BELUM WAWANCARA` *(Default saat baru daftar hadir)*<br>• `SUDAH WAWANCARA (Waktu)` *(Saat Admin meng-approve bahwa peserta telah selesai wawancara)* |

---

## 🖥️ 4. Rancangan Tampilan Antarmuka (UI/UX)

### A. Sisi Peserta (`src/app/page.tsx` & `src/components/exam/`)

1. **Form Registrasi Kehadiran (`LoginView.tsx`)**:
   - Menampilkan input:
     - `Nama Lengkap Peserta`
     - `Email Aktif`
     - `Posisi yang Dilamar`
     - `Alamat Domisili`
   - Tombol Submit: **`Daftar Hadir & Lanjutkan →`**
   - *Catatan pintar*: Jika peserta sudah pernah mengisi daftar hadir sebelumnya (misal tadi daftar di HP lalu sekarang login di komputer ruang ujian menggunakan Nama/Email yang sama), sistem otomatis memulihkan datanya dari `Monitoring_Peserta` tanpa menolak login dan langsung membuka status terbarunya!

2. **Pop-up Alur & Ketentuan Seleksi**:
   - Muncul tepat setelah peserta klik Daftar Hadir.
   - Berisi penjelasan alur 2 tahapan (**Tes Seleksi Kompetensi** & **Tes Wawancara**) serta tata tertib pengerjaan.
   - Memiliki efek *sticky header blur* saat di-*scroll* dan *checkbox* wajib centang sebelum tombol **`Setuju & Lihat Status Seleksi`** aktif.

3. **Halaman Lobby Status Seleksi Peserta (`ParticipantLobbyView.tsx` - Komponen Baru)**:
   - Menampilkan identitas peserta dan **Banner Pengarah Otomatis**:
     - Jika **Sudah Wawancara** & **Belum Kompetensi**:
       > ✅ *"Anda telah menyelesaikan Tes Wawancara! Silakan mengikuti Tes Seleksi Kompetensi."*
     - Jika **Sudah Kompetensi** & **Belum Wawancara**:
       > 🎤 *"Anda telah menyelesaikan Tes Seleksi Kompetensi! Silakan menuju sesi Tes Wawancara untuk mendapatkan persetujuan (Approve) Admin."*
     - Jika **Keduanya Sudah Selesai**:
       > 🎉 *"Selamat! Anda telah menyelesaikan seluruh rangkaian Tes Seleksi Kompetensi dan Tes Wawancara."*
   - Menampilkan **2 Kartu Status**:
     - **Kartu 1 (Tes Seleksi Kompetensi):**
       - Jika `HADIR - MENUNGGU AKSES`: Menampilkan status menunggu persetujuan Admin ruangan (dilengkapi auto-cek berkala / tombol *Cek Status*).
       - Jika `SIAP UJIAN (APPROVED)`: Menampilkan tombol **`▶ Mulai Ujian Sekarang (60 Menit)`**. Saat diklik, barulah server mencatat `Waktu Mulai`, `Batas Selesai`, dan memulai hitung mundur 60 menit.
       - Jika `SELESAI`: Terkunci dengan badge **`✓ Sudah Mengikuti Tes Kompetensi`**.
     - **Kartu 2 (Tes Wawancara):**
       - Jika `BELUM WAWANCARA`: Menampilkan status **`⏳ Belum / Menunggu Approve Wawancara`**.
       - Jika `SUDAH WAWANCARA`: Terkunci dengan badge **`✓ Sudah Mengikuti Tes Wawancara (Approved)`**.

---

### B. Sisi Admin (`src/app/monitoring/page.tsx`)

Halaman `/monitoring` tetap dilindungi PIN Admin dan kini memiliki **Sidebar Kiri** dengan pilihan menu:

1. **Menu 1: 📊 Monitoring Ujian (Default — Dipertahankan 100%)**
   - Tampilan tabel monitoring yang sudah ada sekarang (**No, Nama Peserta, Formasi Posisi, Waktu Mulai & Batas, Sisa Waktu Live, Progres Soal Selesai, Status Ujian**, serta **Banner Alarm Pelanggaran**) tetap utuh tanpa dikurangi.

2. **Menu 2: 💻 Approve Akses Kompetensi**
   - Menampilkan daftar peserta yang sudah Daftar Hadir:
     - Peserta berstatus **`HADIR - MENUNGGU AKSES`** tampil paling atas dengan tombol **`✓ Approve Akses Ujian`**.
     - Tersedia juga tombol **`✓ Approve Semua yang Menunggu`** jika Admin di ruangan ingin langsung membuka akses ujian untuk seluruh peserta di ruangan sekaligus dalam 1 klik!
     - Peserta yang sudah `SIAP UJIAN`, `SEDANG MENGERJAKAN`, atau `SELESAI` tampil di bawahnya.

3. **Menu 3: 🎤 Approve Tes Wawancara**
   - Menampilkan daftar peserta beserta status Tes Kompetensi dan status Wawancaranya:
     - Peserta berstatus **`BELUM WAWANCARA`** tampil di bagian atas dengan tombol **`✓ Approve Selesai Wawancara`**.
     - Peserta yang sudah **`✓ SUDAH WAWANCARA`** otomatis berada di bagian bawah.

---

## ⚡ 5. Strategi Efisiensi Kuota Google Sheets API

1. **Satu Kali Baca (`A2:J500`) untuk Semua Menu Monitoring:**
   Endpoint `GET /api/monitoring` cukup memperluas rentang baca dari `A2:I500` menjadi `A2:J500`. Artinya: baik Admin membuka menu **Monitoring Ujian**, **Approve Kompetensi**, maupun **Approve Wawancara**, jumlah request ke Google Sheets tetap **hanya 1 Read Request per 10 detik** (0 tambahan kuota!).
2. **Endpoint Approve Ringan (`PATCH /api/monitoring`):**
   Saat Admin menekan tombol **Approve Kompetensi** atau **Approve Wawancara**, server hanya melakukan **1 Write Request** langsung ke sel baris peserta terkait (`I{rowNumber}` untuk Kompetensi, atau `J{rowNumber}` untuk Wawancara).
3. **Pembedaan Daftar Hadir vs Mulai Timer (`POST /api/start`):**
   - `action: 'REGISTER'` → Mencatat kehadiran peserta (atau mengembalikan status peserta jika sudah pernah daftar hadir).
   - `action: 'START_EXAM'` → Memastikan statusnya sudah `SIAP UJIAN (APPROVED)`, lalu mengaktifkan timer 60 menit (`Waktu Mulai` & `Batas Selesai`) pada baris peserta tersebut.

