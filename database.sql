-- ============================================================
--  DATABASE AGENSI DIGITAL (nama tabel & kolom berbahasa Indonesia)
--  Cara pakai: HeidiSQL > File > Run SQL file > pilih file ini
--
--  Cara membaca nama kolom:
--    id            = nomor unik tiap baris data (primary key)
--    xxx_id        = penghubung ke tabel xxx (foreign key)
--                    contoh: kategori_id -> mengarah ke tabel kategori_layanan
-- ============================================================
DROP DATABASE IF EXISTS agensi_digital;
CREATE DATABASE agensi_digital CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE agensi_digital;

-- 1. Kategori layanan: pengelompokan layanan (Web, Mobile, Desain, Marketing)
CREATE TABLE kategori_layanan (
  id        INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Nomor unik kategori',
  nama      VARCHAR(80) NOT NULL UNIQUE COMMENT 'Nama kategori',
  deskripsi VARCHAR(255) COMMENT 'Penjelasan singkat kategori'
) ENGINE=InnoDB COMMENT='Pengelompokan layanan';

-- 2. Layanan: jasa yang dijual agensi. Satu layanan masuk ke satu kategori
CREATE TABLE layanan (
  id          INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Nomor unik layanan',
  kategori_id INT NOT NULL COMMENT 'Penghubung ke tabel kategori_layanan',
  judul       VARCHAR(100) NOT NULL COMMENT 'Nama layanan',
  deskripsi   TEXT NOT NULL COMMENT 'Penjelasan layanan',
  ikon        VARCHAR(10) NOT NULL DEFAULT '💼' COMMENT 'Emoji penanda layanan',
  harga_mulai DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'Harga awal dalam Rupiah',
  aktif       TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = tampil di website, 0 = disembunyikan',
  CONSTRAINT fk_layanan_kategori FOREIGN KEY (kategori_id)
    REFERENCES kategori_layanan(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Daftar layanan agensi';

-- 3. Anggota tim: orang yang bekerja di agensi
CREATE TABLE anggota_tim (
  id      INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Nomor unik anggota',
  nama    VARCHAR(100) NOT NULL COMMENT 'Nama lengkap',
  jabatan VARCHAR(100) NOT NULL COMMENT 'Posisi di tim',
  bio     TEXT COMMENT 'Profil singkat'
) ENGINE=InnoDB COMMENT='Anggota tim agensi';

-- 4. Klien: pelanggan agensi
CREATE TABLE klien (
  id         INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Nomor unik klien',
  nama       VARCHAR(100) NOT NULL COMMENT 'Nama kontak klien',
  perusahaan VARCHAR(100) NOT NULL COMMENT 'Nama usaha / perusahaan klien',
  industri   VARCHAR(80) COMMENT 'Bidang usaha klien'
) ENGINE=InnoDB COMMENT='Data klien';

-- 5. Proyek (portofolio): pekerjaan yang pernah dikerjakan
--    Satu proyek memakai satu layanan dan dimiliki satu klien
CREATE TABLE proyek (
  id         INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Nomor unik proyek',
  layanan_id INT NOT NULL COMMENT 'Penghubung ke tabel layanan',
  klien_id   INT NOT NULL COMMENT 'Penghubung ke tabel klien',
  judul      VARCHAR(150) NOT NULL COMMENT 'Nama proyek',
  deskripsi  TEXT COMMENT 'Penjelasan proyek',
  tahun      SMALLINT COMMENT 'Tahun pengerjaan',
  CONSTRAINT fk_proyek_layanan FOREIGN KEY (layanan_id)
    REFERENCES layanan(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_proyek_klien FOREIGN KEY (klien_id)
    REFERENCES klien(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Portofolio proyek';

-- 6. Tim proyek: siapa mengerjakan proyek apa
--    (satu proyek bisa dikerjakan banyak orang, satu orang bisa ikut banyak proyek)
CREATE TABLE tim_proyek (
  proyek_id  INT NOT NULL COMMENT 'Penghubung ke tabel proyek',
  anggota_id INT NOT NULL COMMENT 'Penghubung ke tabel anggota_tim',
  PRIMARY KEY (proyek_id, anggota_id),
  CONSTRAINT fk_timproyek_proyek FOREIGN KEY (proyek_id)
    REFERENCES proyek(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_timproyek_anggota FOREIGN KEY (anggota_id)
    REFERENCES anggota_tim(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Penghubung proyek dan anggota tim';

-- 7. Testimoni: ulasan dari klien (boleh terkait satu proyek)
CREATE TABLE testimoni (
  id        INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Nomor unik testimoni',
  klien_id  INT NOT NULL COMMENT 'Penghubung ke tabel klien',
  proyek_id INT NULL COMMENT 'Penghubung ke tabel proyek (boleh kosong)',
  rating    TINYINT NOT NULL COMMENT 'Nilai 1 sampai 5',
  komentar  TEXT NOT NULL COMMENT 'Isi ulasan',
  CONSTRAINT chk_testimoni_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_testimoni_klien FOREIGN KEY (klien_id)
    REFERENCES klien(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_testimoni_proyek FOREIGN KEY (proyek_id)
    REFERENCES proyek(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Ulasan klien';

-- 8. FAQ: pertanyaan yang sering ditanyakan
CREATE TABLE faq (
  id         INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Nomor unik FAQ',
  pertanyaan VARCHAR(255) NOT NULL COMMENT 'Isi pertanyaan',
  jawaban    TEXT NOT NULL COMMENT 'Isi jawaban',
  urutan     INT NOT NULL DEFAULT 0 COMMENT 'Urutan tampil (kecil = paling atas)'
) ENGINE=InnoDB COMMENT='Pertanyaan umum';

-- 9. Status pesan: tahapan penanganan pesan (Baru, Diproses, Selesai, Dibatalkan)
CREATE TABLE status_pesan (
  id   INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Nomor unik status',
  nama VARCHAR(40) NOT NULL UNIQUE COMMENT 'Nama status'
) ENGINE=InnoDB COMMENT='Daftar status pesan';

-- 10. Pesan masuk: permintaan dari calon klien lewat form Hubungi Kami
CREATE TABLE pesan_masuk (
  id          INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Nomor unik pesan',
  kode        VARCHAR(20) UNIQUE COMMENT 'Kode pesan untuk cek status, contoh INQ-0001',
  layanan_id  INT NULL COMMENT 'Penghubung ke tabel layanan (boleh kosong = konsultasi umum)',
  status_id   INT NOT NULL DEFAULT 1 COMMENT 'Penghubung ke tabel status_pesan',
  nama        VARCHAR(100) NOT NULL COMMENT 'Nama pengirim',
  email       VARCHAR(150) NOT NULL COMMENT 'Email pengirim',
  telepon     VARCHAR(30) COMMENT 'Nomor telepon pengirim (opsional)',
  judul       VARCHAR(150) NOT NULL COMMENT 'Judul pesan',
  isi_pesan   TEXT NOT NULL COMMENT 'Isi pesan',
  dibuat_pada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Waktu pesan dikirim',
  CONSTRAINT fk_pesan_layanan FOREIGN KEY (layanan_id)
    REFERENCES layanan(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_pesan_status FOREIGN KEY (status_id)
    REFERENCES status_pesan(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Pesan dari calon klien';

-- 11. Admin: akun pengelola website (password disimpan dalam bentuk hash)
CREATE TABLE admin (
  id              INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Nomor unik admin',
  username        VARCHAR(50) NOT NULL UNIQUE COMMENT 'Nama pengguna untuk login',
  kata_sandi_hash VARCHAR(255) NOT NULL COMMENT 'Kata sandi yang sudah diacak (hash)'
) ENGINE=InnoDB COMMENT='Akun admin';

-- ===================== DATA CONTOH =====================
INSERT INTO kategori_layanan (nama, deskripsi) VALUES
('Web Development', 'Website dan aplikasi berbasis web'),
('Mobile App', 'Aplikasi Android dan iOS'),
('Desain & Branding', 'Tampilan dan identitas visual bisnis'),
('Digital Marketing', 'Promosi dan pertumbuhan bisnis online');

INSERT INTO layanan (kategori_id, judul, deskripsi, ikon, harga_mulai) VALUES
(1, 'Company Profile Website', 'Website profil perusahaan yang cepat, rapi, dan siap tampil di Google.', '🌐', 3000000),
(1, 'Web Application Kustom', 'Sistem berbasis web sesuai kebutuhan: dashboard, reservasi, inventaris, dan lainnya.', '💻', 8000000),
(1, 'Toko Online / E-Commerce', 'Toko online lengkap dengan katalog produk, keranjang, dan pembayaran.', '🛒', 6000000),
(2, 'Aplikasi Android & iOS', 'Aplikasi mobile dengan pengalaman pengguna yang mulus dan performa tinggi.', '📱', 15000000),
(3, 'UI/UX Design', 'Riset pengguna, wireframe, hingga prototipe interaktif yang mudah digunakan.', '🎨', 2500000),
(3, 'Logo & Branding', 'Identitas visual yang konsisten: logo, warna, tipografi, dan panduan brand.', '✏️', 1500000),
(4, 'SEO & Optimasi Website', 'Tingkatkan peringkat website Anda di mesin pencari secara berkelanjutan.', '🔍', 2000000),
(4, 'Social Media Management', 'Pengelolaan konten dan iklan media sosial untuk menjangkau lebih banyak pelanggan.', '📣', 2500000);

INSERT INTO anggota_tim (nama, jabatan, bio) VALUES
('Rizky Pratama', 'Founder & Full-Stack Developer', 'Berpengalaman 8 tahun membangun aplikasi web untuk UMKM hingga perusahaan.'),
('Dewi Lestari', 'UI/UX Designer', 'Fokus pada desain yang sederhana, indah, dan mudah dipakai semua orang.'),
('Andi Saputra', 'Mobile Developer', 'Spesialis aplikasi Android dan iOS dengan Flutter dan Kotlin.'),
('Sari Wulandari', 'Digital Marketing Specialist', 'Ahli SEO dan iklan digital yang berfokus pada hasil terukur.'),
('Bagus Hidayat', 'Backend Developer', 'Merancang database dan API yang aman, cepat, dan mudah dikembangkan.'),
('Putri Anjani', 'Project Manager', 'Memastikan setiap proyek selesai tepat waktu dengan komunikasi yang jelas.');

INSERT INTO klien (nama, perusahaan, industri) VALUES
('Ahmad Fauzi', 'Warung Kopi Senja', 'Makanan & Minuman'),
('Ratna Sari', 'Batik Nusantara', 'Fashion'),
('dr. Hendra Wijaya', 'Klinik Sehat Sentosa', 'Kesehatan'),
('Maya Kusuma', 'Bimbel Cerdas Mandiri', 'Pendidikan'),
('Joko Susilo', 'Toko Bangunan Jaya Abadi', 'Retail'),
('Lina Marlina', 'Lampung Travel Adventure', 'Pariwisata'),
('Tono Wibowo', 'Kedai Roti Manis', 'Makanan & Minuman'),
('Hartono', 'PT Maju Logistik', 'Logistik');

INSERT INTO proyek (layanan_id, klien_id, judul, deskripsi, tahun) VALUES
(1, 1, 'Website Warung Kopi Senja', 'Website profil dengan menu digital dan peta lokasi cabang.', 2024),
(3, 2, 'Toko Online Batik Nusantara', 'E-commerce dengan 300+ produk batik dan pembayaran online.', 2024),
(2, 3, 'Sistem Antrian Klinik', 'Pendaftaran pasien online dan antrian real-time.', 2025),
(4, 4, 'Aplikasi Belajar Cerdas Mandiri', 'Aplikasi latihan soal dan jadwal les untuk siswa.', 2025),
(3, 5, 'Katalog Online Jaya Abadi', 'Katalog material bangunan dengan pencarian cepat.', 2023),
(6, 6, 'Branding Lampung Travel', 'Logo, palet warna, dan materi promosi paket wisata.', 2024),
(5, 6, 'Redesign UI Booking Wisata', 'Desain ulang alur pemesanan paket wisata agar lebih singkat.', 2025),
(7, 7, 'SEO Kedai Roti Manis', 'Optimasi pencarian lokal yang menaikkan kunjungan 3x lipat.', 2024),
(2, 8, 'Dashboard Tracking Logistik', 'Pelacakan pengiriman dan laporan otomatis untuk armada.', 2025),
(8, 2, 'Kampanye Instagram Batik', 'Pengelolaan konten dan iklan Instagram selama 6 bulan.', 2025);

INSERT INTO tim_proyek (proyek_id, anggota_id) VALUES
(1,1),(1,2),(2,1),(2,5),(3,5),(3,1),(3,6),(4,3),(4,2),(5,1),(5,6),
(6,2),(7,2),(7,6),(8,4),(9,5),(9,1),(10,4),(10,2);

INSERT INTO testimoni (klien_id, proyek_id, rating, komentar) VALUES
(1, 1, 5, 'Website selesai cepat dan hasilnya rapi. Pelanggan jadi lebih mudah menemukan menu kami.'),
(2, 2, 5, 'Penjualan online naik drastis setelah toko baru live. Timnya sangat responsif.'),
(3, 3, 4, 'Antrian pasien jadi tertib. Ada sedikit revisi, tapi semuanya ditangani dengan baik.'),
(4, 4, 5, 'Aplikasinya disukai siswa. Desainnya sederhana dan mudah dipakai.'),
(6, 6, 5, 'Branding baru membuat bisnis kami tampil lebih profesional dan terpercaya.'),
(7, 8, 4, 'Kedai kami sekarang muncul di halaman pertama Google untuk kata kunci lokal.'),
(8, 9, 5, 'Dashboard-nya menghemat banyak waktu laporan harian kami.');

INSERT INTO faq (pertanyaan, jawaban, urutan) VALUES
('Berapa lama pengerjaan sebuah website?', 'Company profile biasanya 1-2 minggu, toko online 3-5 minggu, dan aplikasi kustom 1-3 bulan tergantung fitur.', 1),
('Apakah ada revisi setelah proyek selesai?', 'Ya. Setiap paket mendapat revisi sesuai kesepakatan dan garansi perbaikan bug selama 30 hari.', 2),
('Bagaimana sistem pembayarannya?', 'Pembayaran dibagi dua tahap: 50% di awal dan 50% setelah proyek selesai.', 3),
('Apakah saya bisa mengelola konten sendiri?', 'Bisa. Kami menyediakan halaman admin sederhana dan panduan penggunaan.', 4),
('Bagaimana cara memantau status permintaan saya?', 'Setelah mengirim pesan, Anda mendapat kode. Masukkan kode dan email di bagian Cek Status.', 5),
('Apakah menyediakan hosting dan domain?', 'Ya, kami bisa membantu pengadaan domain, hosting, dan pemeliharaannya.', 6);

INSERT INTO status_pesan (nama) VALUES ('Baru'), ('Diproses'), ('Selesai'), ('Dibatalkan');

INSERT INTO pesan_masuk (kode, layanan_id, status_id, nama, email, telepon, judul, isi_pesan) VALUES
('INQ-0001', 1, 3, 'Budi Santoso', 'budi@example.com', '081234567801', 'Website company profile', 'Kami ingin website profil untuk usaha percetakan.'),
('INQ-0002', 3, 2, 'Citra Dewi', 'citra@example.com', '081234567802', 'Toko online hijab', 'Mohon penawaran toko online dengan 100 produk.'),
('INQ-0003', 4, 1, 'Doni Pratama', 'doni@example.com', NULL, 'Aplikasi kasir', 'Ingin aplikasi kasir Android untuk 3 cabang.'),
('INQ-0004', NULL, 1, 'Eka Putri', 'eka@example.com', '081234567804', 'Konsultasi umum', 'Saya belum tahu layanan yang cocok untuk bisnis katering saya.'),
('INQ-0005', 7, 4, 'Fajar Nugroho', 'fajar@example.com', NULL, 'SEO blog', 'Dibatalkan karena anggaran belum cukup.');
