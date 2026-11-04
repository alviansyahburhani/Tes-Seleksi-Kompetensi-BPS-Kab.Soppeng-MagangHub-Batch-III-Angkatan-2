keamanan ketika waktu pengerjaan soal,data peserta hilang di database harusnya dia langsung keluar dari soal, karena tidak terdeteksi lagi oleh server 

🧱 Tahap 1: Pondasi Backend & Google Sheets (src/app/api/start & src/app/api/monitoring)

Kita mulai dari Backend API terlebih dahulu karena ini yang mengatur penyimpanan data di sheet Monitoring_Peserta (Kolom A s/d Kolom J):

Update /api/start/route.ts:
Memisahkan aksi Daftar Hadir (REGISTER) dan aksi Mulai Timer Ujian (START_EXAM).
Saat peserta klik Daftar Hadir, datanya masuk ke Monitoring_Peserta dengan Status Ujian = HADIR - MENUNGGU AKSES dan Status Wawancara = BELUM WAWANCARA (atau jika peserta sudah pernah daftar hadir sebelumnya, langsung mengembalikan status terbarunya tanpa menolak login).
Saat peserta klik Mulai Ujian Sekarang (setelah di-approve Admin), barulah server mengisi Waktu Mulai, Batas Selesai, dan menjalankan timer 60 menit.
Update /api/monitoring/route.ts:
Membaca sampai Kolom J (Status Wawancara).
Menambahkan fungsi PATCH /api/monitoring untuk tombol Admin:
Approve Akses Kompetensi (mengubah HADIR - MENUNGGU AKSES menjadi SIAP UJIAN (APPROVED)).
Approve Selesai Wawancara (mengubah BELUM WAWANCARA menjadi SUDAH WAWANCARA).
📱 Tahap 2: Alur Halaman Peserta (LoginView.tsx, ParticipantLobbyView.tsx, & page.tsx)

Setelah API siap, kita kerjakan tampilan untuk peserta:

Form Daftar Hadir Pertama Kali → setelah diisi dan diklik, baru memunculkan Pop-up Alur & Ketentuan (Checkbox Wajib).
Halaman Lobby Status Seleksi Peserta (ParticipantLobbyView.tsx):
Menampilkan status Tes Seleksi Kompetensi dan Tes Wawancara secara live.
Mengarahkan otomatis (jika sudah wawancara → diarahkan ke tes kompetensi; jika sudah tes kompetensi → diarahkan ke wawancara).
Tombol Mulai Ujian Sekarang (60 Menit) yang baru bisa diklik setelah Admin memberikan Approve Akses Kompetensi.
🖥️ Tahap 3: Sidebar Approve di Halaman Admin (src/app/monitoring/page.tsx)

Terakhir, kita tambahkan Sidebar Navigasi Kiri di halaman /monitoring:

Menu 1: 📊 Monitoring Ujian (Tabel monitoring yang sekarang tetap utuh 100%).
Menu 2: 💻 Approve Akses Kompetensi (Daftar peserta yang menunggu izin ujian + tombol Approve).
Menu 3: 🎤 Approve Tes Wawancara (Daftar peserta untuk di-approve selesai wawancara).


Jadi aturan pengisian sel di sheet Monitoring_Peserta kita kunci seperti ini:

Saat Peserta Baru Mengisi Daftar Hadir (REGISTER):
Kolom A – D: Terisi Nama Peserta, Email, Posisi Dilamar, Alamat Domisili.
Kolom E – J (Waktu Mulai, Batas Selesai, Sisa Waktu, Progress Jawaban, Status Ujian, Status Wawancara): DIKOSONGKAN ("") terlebih dahulu!
Saat Admin Klik Approve Wawancara:
Kolom J (Status Wawancara) baru terisi: SUDAH WAWANCARA (...).
Saat Admin Klik Approve Akses Kompetensi:
Di sel Spreadsheet tetap kosong atau hanya ditandai siap, dan begitu Peserta Klik "Mulai Ujian Sekarang", barulah:
Kolom E – H terisi Waktu Mulai, Batas Selesai, 60:00, 0 / Y Soal.
Kolom I (Status Ujian) terisi SEDANG MENGERJAKAN.
Saat Peserta Klik Kirim / Kumpul Jawaban (Submit):
Kolom I (Status Ujian) berubah menjadi SELESAI (...).