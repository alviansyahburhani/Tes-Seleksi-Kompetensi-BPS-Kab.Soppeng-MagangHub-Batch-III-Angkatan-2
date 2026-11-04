# Sistem Desain UI/UX — Seleksi MagangHub BPS Kabupaten Soppeng
**Gaya Desain**: *Clean GovTech / Modern Minimalist Assessment Portal*  
**Identitas Brand**: Badan Pusat Statistik (BPS) — Biru (`#00AEEF`), Hijau (`#8CC63F`), dan Oranye (`#F7941D`)

Dokumen `desain.md` ini adalah panduan tunggal (*Single Source of Truth*) untuk memastikan seluruh halaman, komponen, tombol, formulir, pop-up modal, hingga ikon SVG memiliki standar visual yang **100% konsisten, bersih, profesional, dan nyaman di mata**.

---

## 1. Filosofi & Prinsip Utama Desain

1. **Bersih & Tenang di Mata (*Low Visual Fatigue*)**:
   - Peserta mengerjakan ujian selama **60 menit** dan Admin memantau puluhan peserta secara *real-time*. Hindari garis tepi hitam tebal (`border-4 border-slate-950`) dan bayangan blok kasar (`shadow-[8px_8px_0px_#0f172a]`).
   - Gunakan latar belakang sejuk (`bg-slate-50` / `#F8FAFC`), kartu putih bersih (`bg-white`), garis batas tipis (`border border-slate-200`), dan bayangan lembut (`shadow-sm` atau `shadow-md`).
2. **Tombol Warna Solid yang Jelas Maknanya (*High Affordance Solid Buttons*)**:
   - Semua tombol interaktif utama menggunakan **warna solid penuh** (tanpa gradasi membingungkan) agar peserta dan Admin langsung memahami fungsi tombol dalam sekali lihat.
3. **Identitas Tiga Warna BPS yang Elegan**:
   - Ketiga warna logo BPS (**Biru `#00AEEF`**, **Hijau `#8CC63F`**, **Oranye `#F7941D`**) tetap menjadi nyawa utama antarmuka, baik melalui **Top Color Strip BPS** di setiap kartu utama maupun sebagai penanda status tahapan.
4. **Tipografi Terstruktur & Mudah Dibaca**:
   - Tidak lagi menggunakan `font-black uppercase` pada seluruh teks. Gunakan huruf besar-kecil natural (*Title Case* untuk judul, *Sentence case* untuk deskripsi) dengan ketebalan `font-medium`, `font-semibold`, dan `font-bold`.

---

## 2. Sistem Palet Warna (*Color Tokens*)

### 2.1. Warna Dasar & Permukaan (*Surfaces & Neutrals*)
| Token / Kegunaan | Kode Hex | Kelas Tailwind CSS | Keterangan Penggunaan |
| :--- | :--- | :--- | :--- |
| **Background Halaman** | `#F8FAFC` | `bg-slate-50` | Latar belakang utama seluruh halaman (Peserta & Monitoring Admin) |
| **Permukaan Kartu Utama** | `#FFFFFF` | `bg-white` | Kartu form login, kartu tahapan seleksi, kartu soal, tabel monitoring |
| **Permukaan Sekunder / Sub-Box** | `#F8FAFC` / `#F1F5F9` | `bg-slate-50` / `bg-slate-100/80` | Kotak ringkasan identitas, area info di dalam kartu, header tabel |
| **Garis Tepi Standar (Border)** | `#E2E8F0` | `border-slate-200` | Garis tepi standar untuk semua kartu, input, dan pembatas |
| **Garis Tepi Fokus / Hover** | `#CBD5E1` | `border-slate-300` | Garis tepi saat elemen sekunder di-hover |
| **Teks Utama (Heading & Isi Soal)** | `#0F172A` | `text-slate-900` | Judul halaman, nama peserta, teks pertanyaan soal |
| **Teks Sekunder (Deskripsi)** | `#475569` | `text-slate-600` | Penjelasan alur, instruksi, email, alamat, sub-judul |
| **Teks Redup (Label Kecil / Caption)** | `#64748B` | `text-slate-500` | Label mikro di atas data, timestamp, placeholder |

### 2.2. Tiga Warna Identitas BPS (*Brand & Semantic Colors*)

#### A. Biru BPS (*Primary / Kompetensi / Informasi / Aktif*)
- **Warna Solid Utama**: `#00AEEF` (`bg-[#00AEEF]`)
- **Warna Solid Hover**: `#0099D6` (`hover:bg-[#0099D6]`)
- **Warna Teks di Atas Tombol Solid Biru**: Putih (`text-white`) untuk kontras modern yang bersih, atau `text-slate-950` pada badge aksen.
- **Permukaan Lembut (Soft Tint)**: `bg-[#F0F9FF]` (`bg-sky-50`) dengan border `border-[#BAE6FD]` (`border-sky-200`) dan teks `text-[#0369A1]` (`text-sky-700`).
- **Kegunaan**:
  - Tombol Masuk / Login Cepat, Navigasi Soal ("Selanjutnya"), Nomor Soal yang Sedang Dibuka, Badge Formasi Dilamar, Ikon Tahap Kompetensi, Tombol Izinkan Notifikasi.

#### B. Hijau BPS (*Success / Selesai / Approved / Lulus*)
- **Warna Solid Utama**: `#8CC63F` (`bg-[#8CC63F]`) atau Hijau Emerald Tegas `#16A34A` untuk teks kecil.
- **Warna Solid Hover**: `#7BB335` (`hover:bg-[#7BB335]`)
- **Warna Teks di Atas Tombol Solid Hijau**: `text-slate-950` (`font-semibold` / `font-bold`) atau `text-white` (jika menggunakan `#16A34A`). Untuk konsistensi brand BPS: gunakan `bg-[#8CC63F] hover:bg-[#7BB335] text-slate-950`.
- **Permukaan Lembut (Soft Tint)**: `bg-[#F4FCEB]` (`bg-lime-50` / `bg-emerald-50/70`) dengan border `border-[#D9F99D]` (`border-lime-200`) dan teks `text-[#3F6212]` (`text-lime-800` / `text-emerald-800`).
- **Kegunaan**:
  - Tombol **"Mulai Ujian Sekarang"**, Tombol **"Kumpulkan Jawaban"**, Tombol **Approve** di Monitoring Admin, Badge **"Sudah Selesai / Disetujui"**, Nomor Soal yang Sudah Dijawab, dan Kartu Pengumuman **LULUS**.

#### C. Oranye BPS (*Highlight / Simpan Daftar Hadir / Wawancara / Menunggu*)
- **Warna Solid Utama**: `#F7941D` (`bg-[#F7941D]`)
- **Warna Solid Hover**: `#E08312` (`hover:bg-[#E08312]`)
- **Warna Teks di Atas Tombol Solid Oranye**: `text-slate-950` atau `text-white` (gunakan `text-slate-950 font-semibold` agar sangat jelas terbaca).
- **Permukaan Lembut (Soft Tint)**: `bg-[#FFFBEB]` (`bg-amber-50`) dengan border `border-[#FDE68A]` (`border-amber-200`) dan teks `text-[#B45309]` (`text-amber-800`).
- **Kegunaan**:
  - Tombol **"Simpan Daftar Hadir"**, Ikon & Aksen **Tahap Wawancara**, Badge **"Menunggu Approve Admin"**, Peringatan Sisa Waktu (< 10 menit), serta Kotak Informasi Penting.

#### D. Merah Semantik (*Danger / Pelanggaran Anti-Cheat / Hapus / Waktu Kritis*)
- **Warna Solid Utama**: `#EF4444` (`bg-red-500` / `bg-red-600 hover:bg-red-700 text-white`)
- **Permukaan Lembut**: `bg-red-50 border border-red-200 text-red-700`
- **Kegunaan**:
  - Alert Pelanggaran Pindah Tab, Error Validasi Form, Sisa Waktu Kritis (< 5 menit), Tombol Tolak / Cabut Approve / Hapus Peserta.

---

## 3. Elemen Khas Identitas BPS (*Brand Signature Elements*)

### 3.1. Top Strip 3 Warna BPS (*BPS Signature Tri-Color Bar*)
Setiap kartu utama (`Login`, `Lobby`, `Modal Pop-up`, `FinishedView`, dan `Header Monitoring`) wajib memiliki pita 3 warna BPS di bagian paling atas kartu, namun dengan tampilan **minimalis tanpa garis pemisah hitam**:
```tsx
<div className="grid grid-cols-3 h-1.5 w-full overflow-hidden">
  <div className="bg-[#00AEEF]" />
  <div className="bg-[#8CC63F]" />
  <div className="bg-[#F7941D]" />
</div>
```

### 3.2. Container Logo BPS
Logo `/BPSIndonesia.svg` ditempatkan dalam bingkai bersih:
- Kelas: `w-12 h-12 md:w-14 md:h-14 bg-white border border-slate-200 rounded-xl p-2.5 shadow-xs flex items-center justify-center shrink-0`

### 3.3. Dekorasi Latar Belakang Halaman (*Subtle Ambient Background*)
Menggantikan bentuk lingkaran/kotak bergaris hitam Neobrutalism dengan aksen dot-grid halus atau pendaran warna (*soft radial blur*) yang tidak mengganggu fokus baca:
- Latar dasar: `bg-slate-50`
- Dekorasi opsional di sudut layar (`pointer-events-none fixed`): lingkaran lembut `bg-[#00AEEF]/5`, `bg-[#8CC63F]/5`, `bg-[#F7941D]/5` dengan `blur-3xl rounded-full`.

---

## 4. Tipografi & Hierarki Teks

Gunakan font bawaan sistem/Geist Sans yang sudah terpasang di `layout.tsx`, dengan aturan skala berikut:

1. **Judul Utama Halaman (H1)**:
   - `text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-snug`
   - *Catatan*: Gunakan **Title Case** (contoh: `"Status Tahapan Seleksi Peserta"`, bukan `"STATUS TAHAPAN SELEKSI PESERTA"`).
2. **Judul Kartu / Judul Modal (H2)**:
   - `text-base md:text-lg font-bold text-slate-900 tracking-tight`
3. **Sub-Judul / Judul Seksi (H3)**:
   - `text-sm font-semibold text-slate-800`
4. **Teks Isi Soal Ujian**:
   - `text-sm md:text-base font-normal md:font-medium text-slate-800 leading-relaxed` (sangat nyaman untuk membaca wacana panjang).
5. **Label Input Form**:
   - `block text-xs font-semibold text-slate-700 mb-1.5` (tanpa huruf kapital semua yang berlebihan).
6. **Label Mikro / Eyebrow / Badge**:
   - `text-[11px] font-semibold uppercase tracking-wider` (hanya badge status dan label kategori kecil yang menggunakan `uppercase`).

---

## 5. Spesifikasi Detail Komponen (*Component Blueprints*)

### 5.1. Kartu Utama (*Primary Card*)
- **Sudut**: `rounded-2xl` (`16px`)
- **Garis Tepi**: `border border-slate-200/90`
- **Bayangan**: `shadow-sm` (atau `shadow-lg shadow-slate-900/5` untuk kartu terpusat seperti Login & Lobby)
- **Overflow**: `overflow-hidden` (agar Top Strip 3 Warna BPS mengikuti lengkungan sudut atas kartu).

### 5.2. Kartu Sub-Bagian / Bento Box (*Secondary Card*)
- **Sudut**: `rounded-xl` (`12px`)
- **Garis Tepi**: `border border-slate-200`
- **Latar**: `bg-slate-50/70` atau `bg-white`
- **Padding**: `p-4` atau `p-5`

### 5.3. Tombol (*Solid Buttons*)
Semua tombol menggunakan sudut `rounded-xl` (`12px`) untuk tombol besar atau `rounded-lg` (`8px`) untuk tombol kecil di tabel/header, dengan transisi halus `transition-all duration-150 active:scale-[0.99]`:

1. **Tombol Solid Biru (Primary / Navigasi / Masuk / Notifikasi)**:
   ```
   bg-[#00AEEF] hover:bg-[#0099D6] text-white font-semibold text-sm py-3 px-5 rounded-xl shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
   ```
2. **Tombol Solid Hijau (Mulai Ujian / Kumpulkan / Setuju / Approve)**:
   ```
   bg-[#8CC63F] hover:bg-[#7BB335] text-slate-950 font-semibold text-sm py-3 px-5 rounded-xl shadow-xs hover:shadow transition-all cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed
   ```
3. **Tombol Solid Oranye (Simpan Daftar Hadir / Aksi Penting / Wawancara)**:
   ```
   bg-[#F7941D] hover:bg-[#E08312] text-slate-950 font-semibold text-sm py-3 px-5 rounded-xl shadow-xs hover:shadow transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
   ```
4. **Tombol Sekunder / Netral (Batal / Kembali / Cek Status Terbaru / Selesai & Keluar)**:
   ```
   bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-semibold text-sm py-2.5 px-4 rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer disabled:bg-slate-100 disabled:text-slate-400
   ```
5. **Tombol Bahaya Solid (Hapus / Reset / Konfirmasi Pelanggaran)**:
   ```
   bg-red-600 hover:bg-red-700 text-white font-semibold text-sm py-2.5 px-4 rounded-xl shadow-xs transition-all cursor-pointer
   ```

### 5.4. Input Formulir, Select Dropdown, & Textarea
- **Kondisi Normal**:
  `w-full px-3.5 py-2.5 bg-slate-50/60 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-all`
- **Kondisi Fokus (Focus Ring Biru BPS)**:
  `focus:outline-none focus:bg-white focus:border-[#00AEEF] focus:ring-3 focus:ring-[#00AEEF]/15`
- **Kondisi Readonly / Disabled**:
  `disabled:bg-slate-100 disabled:text-slate-500`

### 5.5. Tab Switcher (Contoh: "Form Hadir Baru" vs "Sudah Absen" & Tab Monitoring)
- Menggunakan container *Segmented Pill* modern:
  - Container: `bg-slate-100 p-1.5 rounded-xl border border-slate-200/80 grid grid-cols-2 gap-1.5`
  - Tab Aktif (Biru Solid atau Putih Bersih dengan Aksen):
    - Untuk Login: `bg-[#00AEEF] text-white font-semibold rounded-lg py-2.5 px-3 shadow-xs` (atau `bg-[#8CC63F] text-slate-950` untuk tab kedua agar selaras dengan warna BPS).
  - Tab Tidak Aktif:
    - `bg-transparent hover:bg-white/60 text-slate-600 font-medium rounded-lg py-2.5 px-3`

### 5.6. Badge & Pill Status
Semua badge menggunakan sudut `rounded-full` atau `rounded-md` dengan padding `px-2.5 py-0.5 text-[11px] font-semibold`:
- **Badge Biru (Formasi / Aktif / Sedang Ujian)**:
  `bg-[#00AEEF]/12 text-[#0284C7] border border-[#00AEEF]/25 rounded-full` (atau solid `bg-[#00AEEF] text-white` untuk penekanan tinggi).
- **Badge Hijau (Selesai / Approved / Lulus)**:
  `bg-[#8CC63F]/20 text-[#3F6212] border border-[#8CC63F]/40 rounded-full`
- **Badge Oranye (Menunggu Approve / Belum Wawancara)**:
  `bg-[#F7941D]/15 text-[#B45309] border border-[#F7941D]/30 rounded-full`
- **Badge Netral**:
  `bg-slate-100 text-slate-600 border border-slate-200 rounded-full`

### 5.7. Pop-up Modal (*Dialog Overlay*)
- **Backdrop**: `fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4`
- **Container Modal**: `bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden my-auto`
- **Header Modal**:
  - Diawali dengan **Top Strip 3 Warna BPS (`h-1.5`)**.
  - Baris judul: `bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between` dengan judul `text-base font-bold text-slate-900`.

---

## 6. Standar Sistem Ikon (*Iconography Specification*)

Untuk menjaga tampilan **Modern Minimalist**, seluruh komponen **DILARANG menggunakan emoji bawaan OS** (seperti 📋, 🎉, ⚠️, 📞, 🎤, ⏳) karena bentuk emoji berbeda-beda di Windows, Android, dan iOS serta merusak kesan bersih.

Sebagai gantinya, gunakan **Inline SVG Outline Icons (Gaya Lucide / Feather)** dengan spesifikasi seragam:

### 6.1. Aturan Teknis SVG Icon
- `viewBox="0 0 24 24"`
- `fill="none"`
- `stroke="currentColor"`
- `strokeWidth="2"` (untuk ikon ukuran `w-4 h-4` s/d `w-5 h-5`) atau `strokeWidth="1.75"` (untuk ikon besar `w-6 h-6`).
- `strokeLinecap="round"`
- `strokeLinejoin="round"`

### 6.2. Pembungkus Ikon (*Icon Badge Container*)
Ketika ikon ditempatkan di samping judul kartu atau di dalam kotak pemberitahuan, bungkus dengan kotak membulat halus:
- **Ukuran Kecil (`w-8 h-8`)**: `w-8 h-8 rounded-lg flex items-center justify-center shrink-0`
- **Ukuran Sedang (`w-10 h-10`)**: `w-10 h-10 rounded-xl flex items-center justify-center shrink-0`
- **Variasi Warna Pembungkus Ikon**:
  - **Biru**: `bg-[#00AEEF]/12 text-[#0284C7]` (atau solid `bg-[#00AEEF] text-white`)
  - **Hijau**: `bg-[#8CC63F]/20 text-[#3F6212]` (atau solid `bg-[#8CC63F] text-slate-950`)
  - **Oranye**: `bg-[#F7941D]/15 text-[#D97706]` (atau solid `bg-[#F7941D] text-slate-950`)
  - **Merah**: `bg-red-50 text-red-600`

### 6.3. Katalog Ikon per Fitur
| Fitur / Konteks | Bentuk Ikon SVG | Warna Aksen Ikon |
| :--- | :--- | :--- |
| **Tab Form Hadir Baru** | `ClipboardList` / `UserPlus` (Papan klip / tambah peserta) | Biru (`#00AEEF`) |
| **Tab Sudah Absen (Email)** | `Smartphone` / `MailCheck` (HP / Email terverifikasi) | Hijau (`#8CC63F`) |
| **Input Nomor Telepon** | `Phone` (Gagang telepon minimalis) | Slate / Biru |
| **Tahap 1: Tes Kompetensi** | `Monitor` (Layar komputer ujian) | Biru (`#00AEEF`) |
| **Tahap 2: Tes Wawancara** | `Mic` (Mikrofon wawancara) | Oranye (`#F7941D`) |
| **Status Selesai / Disetujui / Lulus** | `CheckCircle2` (Lingkaran centang halus) | Hijau (`#8CC63F`) |
| **Status Menunggu / Informasi** | `Clock` / `Info` (Jam / Lingkaran info) | Oranye (`#F7941D`) / Biru |
| **Izin Notifikasi Pengumuman** | `Bell` / `BellRing` (Lonceng notifikasi) | Biru (`#00AEEF`) |
| **Tombol Refresh / Cek Status** | `RefreshCw` (Panah putar sinkronisasi) | Slate / Biru |
| **Timer Hitung Mundur Ujian** | `Timer` / `Clock` (Jam hitung mundur) | Biru $\rightarrow$ Oranye $\rightarrow$ Merah |
| **Soal Praktik Spreadsheet / Desain** | `FileSpreadsheet` / `Palette` / `ExternalLink` | Hijau / Oranye |
| **Peringatan / Pelanggaran Anti-Cheat** | `AlertTriangle` / `ShieldAlert` (Segitiga peringatan) | Merah (`#EF4444`) |
| **Monitoring Admin: Kunci PIN** | `Lock` / `KeyRound` (Gembok keamanan Admin) | Biru (`#00AEEF`) |

---

## 7. Rincian Desain per Halaman & Fitur

### 7.1. Halaman Daftar Hadir & Login Cepat (`LoginView.tsx`)
- **Layout**: Satu kartu utama terpusat (`max-w-xl w-full bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-900/5 overflow-hidden`).
- **Header**: Top Strip 3 Warna BPS (`h-1.5`), diikuti Logo BPS dalam bingkai `rounded-xl`, badge lembut `"Batch III • Angkatan 2 Tahun 2026"`, dan judul `"Daftar Hadir & Akses Seleksi"`.
- **Tab Switcher**: 2 tombol tab bersih di dalam `bg-slate-100 p-1.5 rounded-xl`:
  - Tab 1: **Form Hadir Baru** (Aktif: Solid Biru `#00AEEF text-white`).
  - Tab 2: **Sudah Absen** (Aktif: Solid Hijau `#8CC63F text-slate-950`).
- **Tombol Submit**:
  - Tab 1: Tombol Solid Oranye (`bg-[#F7941D] hover:bg-[#E08312] text-slate-950 font-semibold rounded-xl py-3.5`).
  - Tab 2: Tombol Solid Biru (`bg-[#00AEEF] hover:bg-[#0099D6] text-white font-semibold rounded-xl py-3.5`).
- **Modal Konfirmasi Simpan & Modal Alur Ketentuan**:
  - Menggunakan overlay `backdrop-blur-xs bg-slate-900/50`, kartu putih `rounded-2xl`, daftar ketentuan bernomor rapi di dalam kotak `bg-slate-50 border border-slate-200 rounded-xl`, dan tombol setuju Solid Hijau (`bg-[#8CC63F]`).

### 7.2. Halaman Portal Status Seleksi (`ParticipantLobbyView.tsx`)
- **Kartu Utama**: `max-w-3xl w-full bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-900/5 overflow-hidden`.
- **Baris Atas**: Pill badge `"Daftar Hadir Tersimpan"` (Hijau lembut) & `"Portal Status Seleksi"` (Biru lembut), serta tombol `"Cek Status Terbaru"` (`rounded-lg border border-slate-200 bg-white hover:bg-slate-50`) dengan ikon SVG `RefreshCw`.
- **Kotak Identitas Peserta**: `bg-slate-50 border border-slate-200 rounded-xl p-4` menampilkan Nama, Email, Ikon SVG Telepon + Nomor, Alamat, serta Pill Badge Formasi (`bg-[#00AEEF]/12 text-[#0284C7]`).
- **Banner Arahan Tahap**: Menggunakan kotak `rounded-xl border` dengan warna lembut sesuai status (Biru lembut jika diarahkan ke Kompetensi, Oranye lembut jika diarahkan ke Wawancara) dilengkapi ikon SVG di sebelah kiri.
- **2 Kartu Tahapan (Grid 2 Kolom)**:
  - **Kartu 1 (Tes Seleksi Kompetensi)**: `rounded-xl border border-slate-200 p-5 bg-white`, ikon `Monitor` dalam kotak Biru, badge status di kanan atas, dan tombol Solid Hijau (`bg-[#8CC63F]`) saat akses disetujui Admin.
  - **Kartu 2 (Tes Wawancara)**: `rounded-xl border border-slate-200 p-5 bg-white`, ikon `Mic` dalam kotak Oranye, badge status di kanan atas, dan indikator status verifikasi di bagian bawah.
- **Pop-up Otomatis Selesai Seleksi & Pengumuman Kelulusan**:
  - Muncul sebagai modal `rounded-2xl` yang bersih:
    - Saat menunggu pengumuman: Menampilkan pesan apresiasi hijau lembut, kotak informasi notifikasi dengan tombol Solid Biru **"Aktifkan Notifikasi Update Kelulusan"**, petunjuk login kembali via tab **"Sudah Absen"**, dan tombol **"Selesai & Keluar ke Halaman Utama"**.
    - Saat **LULUS**: Kartu selebrasi elegan berlatar Hijau lembut/solid dengan daftar langkah melengkapi **MagangHub** di dalam kotak putih `rounded-xl`.
    - Saat **TIDAK LULUS**: Kartu apresiasi berlatar hangat (`bg-amber-50/80 border-amber-200`) yang sopan dan memotivasi.

### 7.3. Halaman Ruang Ujian Kompetensi (`ExamHeader`, `QuestionCard`, `QuestionNavigationMap`)
- **ExamHeader (`ExamHeader.tsx`)**:
  - Sticky header `bg-white/95 backdrop-blur-md border-b border-slate-200` dengan Top Strip 3 Warna BPS (`h-1`).
  - Timer hitung mundur dalam kapsul `rounded-xl px-4 py-2 font-mono font-bold` (Biru lembut saat aman, Oranye saat < 10 menit, Merah berdenyut halus saat < 5 menit).
  - Tombol **"Kumpulkan Jawaban"** menggunakan Solid Hijau (`bg-[#8CC63F] hover:bg-[#7BB335] text-slate-950 rounded-xl`).
- **QuestionCard (`QuestionCard.tsx`)**:
  - Kartu `bg-white rounded-2xl border border-slate-200 shadow-xs p-6 md:p-8`.
  - Progress bar tipis di atas soal (`h-2 bg-slate-100 rounded-full` dengan isi `bg-[#00AEEF] rounded-full transition-all`).
  - **Opsi Pilihan Ganda**: Setiap pilihan jawaban berupa kartu `rounded-xl border border-slate-200 p-3.5 hover:bg-slate-50 transition-all`. Saat dipilih: `border-[#00AEEF] bg-[#00AEEF]/8 ring-2 ring-[#00AEEF]/20` dengan lingkaran huruf (`A`, `B`, `C`, `D`, `E`) berubah menjadi Solid Biru (`bg-[#00AEEF] text-white`).
  - **Soal Deskripsi & Praktik**: Menggunakan kotak instruksi yang bersih, tombol buka soal eksternal dengan warna Solid, dan input tautan `rounded-xl`.
  - **Tombol Navigasi Bawah**: Tombol `"Sebelumnya"` (Putih border abu-abu) dan `"Selanjutnya"` (Solid Biru `#00AEEF text-white`).
- **QuestionNavigationMap (`QuestionNavigationMap.tsx`)**:
  - Kartu `bg-white rounded-2xl border border-slate-200 shadow-xs p-5`.
  - Tombol nomor soal berbentuk `rounded-lg font-semibold text-xs h-10`:
    - **Sedang Dibuka**: Solid Biru (`bg-[#00AEEF] text-white ring-2 ring-[#00AEEF]/30`)
    - **Sudah Dijawab**: Solid Hijau (`bg-[#8CC63F] text-slate-950`)
    - **Belum Dijawab**: Netral (`bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200`)

### 7.4. Halaman Selesai Ujian & Modal Ujian (`FinishedView`, `ConfirmSubmitModal`, `UnansweredModal`, `ViolationModal`)
- Seluruhnya menggunakan kartu `bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden` dengan Top Strip 3 Warna BPS, ikon SVG yang relevan, rincian data di dalam `bg-slate-50 rounded-xl p-4`, dan tombol warna solid.

### 7.5. Dashboard Monitoring Admin (`src/app/monitoring/page.tsx`)
- **Login PIN Admin**: Kartu minimalis bersih dengan ikon gembok SVG Biru, input PIN modern, dan tombol masuk Solid Biru.
- **Header Dashboard**: `bg-white border-b border-slate-200` dengan Top Strip 3 Warna BPS, judul dashboard, indikator status sinkronisasi, dan tombol aksi cepat.
- **Kartu Statistik Ringkasan (Summary Cards)**: `bg-white rounded-xl border border-slate-200 p-4 shadow-2xs` dengan ikon dalam kotak warna lembut (Biru, Hijau, Oranye) dan angka statistik `text-2xl font-bold text-slate-900`.
- **Tabel & Kartu Peserta**:
  - Tabel dibungkus dalam `bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden`.
  - Header tabel `bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider`.
  - Baris tabel `divide-y divide-slate-100 hover:bg-slate-50/80 transition-colors`.
  - Tombol **Approve Kompetensi / Approve Wawancara** menggunakan tombol Solid Hijau/Biru `rounded-lg` yang rapi.
- **Sidebar / Drawer Persetujuan (Approval Sidebar)**:
  - Panel samping `bg-white border-l border-slate-200 shadow-2xl` dengan daftar antrean peserta dalam kartu `rounded-xl border border-slate-200 p-3.5`.

