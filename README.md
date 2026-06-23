# FirstAid Guide - Tugas UAS Pemrograman Berbasis Web

FirstAid Guide adalah platform berbasis web gawat darurat mandiri yang menyajikan panduan pertolongan pertama pada berbagai jenis cedera atau kondisi krisis (seperti luka bakar, tersedak, mimisan, pingsan, patah tulang, dan serangan jantung). Platform ini dirancang agar dapat diakses dengan cepat secara responsif oleh masyarakat umum untuk memberikan pertolongan pertama sebelum bantuan medis profesional tiba. Kehadiran platform ini sejalan dengan agenda global SDGs 3 (Good Health and Well-being) untuk meningkatkan akses edukasi kesehatan publik demi keselamatan jiwa. Platform ini juga menyediakan akses langsung ke kontak darurat medis dan panel dashboard admin lengkap untuk mengelola konten edukasi secara dinamis.

---

## 1. Analisis Kebutuhan Sistem

### Aktor Sistem
1. **Pengunjung Umum (Guest/Public User):**
   - Mengakses halaman Beranda, Tentang Aplikasi, dan Kontak Darurat.
   - Mencari panduan pertolongan pertama berdasarkan kata kunci (judul/gejala).
   - Memfilter daftar panduan pertolongan pertama berdasarkan kategori.
   - Membaca artikel detail panduan secara terstruktur.
2. **Administrator (Admin):**
   - Melakukan pendaftaran akun admin baru (Register).
   - Masuk ke panel kendali admin (Login) dengan verifikasi password terenkripsi.
   - Mengakses Dashboard Admin yang berisi statistik jumlah data panduan, kategori, dan kontak darurat.
   - Melakukan operasi CRUD (Create, Read, Update, Delete) pada data Kategori.
   - Melakukan operasi CRUD pada data Kontak Darurat.
   - Melakukan operasi CRUD pada data Panduan Pertolongan Pertama (termasuk upload gambar panduan baru dan penghapusan gambar lama secara otomatis di server).
   - Melakukan Logout untuk menghapus session aktif.

### Kebutuhan Non-Fungsional
- **Security:** Password disimpan dalam bentuk hash menggunakan algoritma bcrypt. Halaman administratif `/admin/*` diproteksi secara ketat menggunakan middleware session; akses tanpa session valid akan ditolak dan diarahkan ke login.
- **Responsiveness:** Desain antarmuka memanfaatkan Bootstrap 5, disesuaikan agar optimal saat diakses melalui smartphone (mobile), tablet, maupun PC desktop.
- **Robustness (Error Handling):** Dilengkapi penanganan halaman 404 (jika halaman tidak ditemukan) dan halaman 500 (jika terjadi kesalahan database/server) secara ramah.
- **Zero-Config Database:** Aplikasi Express.js secara otomatis mendeteksi jika database belum terpasang di MySQL lokal XAMPP. Jika belum ada, sistem akan membuat database, membuat 4 tabel relasional, dan mengimpor data dummy awal secara otomatis saat aplikasi pertama kali dijalankan.

---

## 2 . Entity Relationship Diagram (ERD) & Struktur Database

### ERD Relasional
- Kategori (`categories`) berelasi **One-to-Many** dengan Panduan (`guides`): satu kategori dapat menampung banyak artikel panduan.
- User/Admin (`users`) berelasi **One-to-Many** dengan Kategori (`categories`), Panduan (`guides`), dan Kontak (`emergency_contacts`): satu user admin dapat mengelola dan tercatat sebagai pembuat banyak entitas.

```
+---------------+        1       N        +------------------+
|     users     |------------------------>|    categories    |
+---------------+                        +------------------+
        |                                          |
        | 1                                        | 1
        |                                          |
        | N                                        | N
        |                                          v
        |                                 +------------------+
        |-------------------------------->|      guides      |
        |                                 +------------------+
        | 1
        |
        | N
        v
+--------------------+
| emergency_contacts |
+--------------------+
```

### Struktur Tabel MySQL

1. **Tabel: `users`** (Akun Admin)
   - `id` (INT, Primary Key, Auto Increment)
   - `username` (VARCHAR(50), Unique, Not Null)
   - `password` (VARCHAR(255), Not Null) - *Bcrypt Hashed*
   - `nama` (VARCHAR(100), Not Null)
   - `created_at` (TIMESTAMP, Default Current Timestamp)

2. **Tabel: `categories`** (Kategori Medis)
   - `id` (INT, Primary Key, Auto Increment)
   - `nama` (VARCHAR(100), Unique, Not Null)
   - `deskripsi` (TEXT)
   - `user_id` (INT, Foreign Key referencing `users(id)`, On Delete Set Null)
   - `created_at` (TIMESTAMP, Default Current Timestamp)

3. **Tabel: `guides`** (Panduan Penanganan)
   - `id` (INT, Primary Key, Auto Increment)
   - `judul` (VARCHAR(255), Not Null)
   - `kategori_id` (INT, Foreign Key referencing `categories(id)`, On Delete Cascade)
   - `gejala` (TEXT, Not Null)
   - `langkah_penanganan` (TEXT, Not Null)
   - `gambar` (VARCHAR(255), Nullable) - *Nama file gambar tersimpan*
   - `user_id` (INT, Foreign Key referencing `users(id)`, On Delete Set Null)
   - `created_at` (TIMESTAMP, Default Current Timestamp)

4. **Tabel: `emergency_contacts`** (Kontak Cepat Gawat Darurat)
   - `id` (INT, Primary Key, Auto Increment)
   - `nama_instansi` (VARCHAR(150), Not Null)
   - `nomor_telepon` (VARCHAR(50), Not Null)
   - `alamat` (TEXT, Nullable)
   - `keterangan` (TEXT, Nullable)
   - `user_id` (INT, Foreign Key referencing `users(id)`, On Delete Set Null)
   - `created_at` (TIMESTAMP, Default Current Timestamp)

---

## 4. Struktur Folder Project

```
FirstAid/
│
├── config/
│   └── database.js          # Koneksi MySQL pool & Auto-Migration
│
├── database/
│   ├── schema.sql           # SQL DDL untuk pembuatan tabel
│   └── seed.sql             # SQL DML berisi dummy data awal
│
├── middlewares/
│   └── auth.js              # Proteksi rute admin & helper session alert
│
├── public/                  # Folder aset statis
│   ├── css/
│   │   └── custom.css       # Tambahan styling visual (premium layout)
│   ├── js/
│   │   └── main.js          # Skrip interaktif (konfirmasi hapus data & alert)
│   └── uploads/             # Direktori penyimpanan file gambar panduan
│
├── routes/                  # Controller routing Express.js
│   ├── auth.js              # Alur login, register, dan logout admin
│   ├── admin.js             # Panel kendali dashboard & rute CRUD admin
│   └── user.js              # Halaman beranda, daftar panduan, detail, kontak
│
├── views/                   # Template EJS (Frontend)
│   ├── partials/            # Potongan antarmuka global (navbar, footer, dll)
│   │   ├── header.ejs
│   │   ├── navbar.ejs
│   │   └── footer.ejs
│   ├── user/                # Halaman sisi publik
│   ├── admin/               # Halaman panel CRUD admin
│   ├── auth/                # Halaman masuk & daftar admin
│   ├── 404.ejs              # View error rute salah
│   └── 500.ejs              # View error gangguan server
│
├── .env                     # Variabel konfigurasi port & database
├── package.json             # Manajer modul dependensi Node.js
└── app.js                   # Entry point aplikasi utama Express
```

---

## 5. Dokumentasi Integrasi Teknis

### A. Koneksi Database & Auto-Migration (`config/database.js`)
Sistem menggunakan `mysql2/promise` untuk memanfaatkan pemrograman berbasis `async/await`. Pada saat server diaktifkan:
1. Express terhubung ke server MySQL lokal (XAMPP).
2. Sistem mengecek apakah database `firstaid_db` sudah ada. Jika belum, SQL Query `CREATE DATABASE` akan dikirimkan.
3. Sistem mengecek keberadaan tabel `users`. Jika belum ada, sistem membaca file `database/schema.sql` dan `database/seed.sql` lalu mengeksekusinya secara berurutan menggunakan fitur `multipleStatements: true`. Database dan seluruh data siap pakai secara instan tanpa perlu repot melakukan impor SQL secara manual lewat phpMyAdmin.

### B. Routing & Middleware Autentikasi (`middlewares/auth.js`)
Rute dipisahkan secara modular untuk kebersihan kode. Rute publik dikendalikan oleh `routes/user.js`, sedangkan rute administratif dipusatkan di `routes/admin.js`. 
Keamanan panel admin dijamin oleh middleware berikut:
- **`isLoggedIn`**: Disematkan secara global pada `routes/admin.js`. Jika session `req.session.user` kosong, pengguna dialihkan ke halaman login dengan notifikasi peringatan.
- **`isGuest`**: Menolak pengguna yang sudah login untuk mengakses halaman `/auth/login` atau `/auth/register` dan langsung mengarahkan mereka ke `/admin/dashboard`.

### C. Alur CRUD Panduan dengan Upload Gambar (`routes/admin.js`)
Proses penambahan dan perubahan artikel panduan mendukung unggah file ilustrasi menggunakan `multer`:
1. File gambar diunggah ke `/public/uploads/` dengan nama unik (`gambar-[Timestamp]-[AngkaRandom].[Ekstensi]`).
2. Terdapat filter validasi jenis file (`JPEG/PNG/WEBP`) dan ukuran berkas (maksimal 2MB) demi keamanan sistem.
3. Pada aksi **Update**: Jika admin mengunggah gambar baru, gambar lama yang tersimpan di server akan otomatis dihapus menggunakan modul bawaan Node.js (`fs.unlinkSync`) untuk menghemat kapasitas harddisk.
4. Pada aksi **Delete**: Saat panduan dihapus, gambar penanganan yang berasosiasi dengan data tersebut juga akan dihapus dari server sebelum record di database dihapus.

---

## 6. Panduan Instalasi & Menjalankan Project

Ikuti instruksi berikut untuk memasang dan menjalankan proyek di komputer Anda secara lokal:

### Prasyarat
1. Pastikan Anda sudah menginstall **Node.js** di komputer Anda.
2. Pastikan aplikasi database **MySQL** (biasanya melalui **XAMPP**) dalam keadaan aktif (`Apache` dan `MySQL` di XAMPP Control Panel menyala).

### Langkah 1: Persiapan Project
1. Ekstrak folder project (atau letakkan di direktori kerja Anda).
2. Buka terminal (CMD / PowerShell / Git Bash) dan masuk ke dalam folder project `FirstAid`.
3. Jalankan perintah instalasi dependensi berikut:
   ```bash
   npm install
   ```
   *Catatan Windows:* Jika terjadi execution policy block di PowerShell, gunakan:
   ```powershell
   npm.cmd install
   ```

### Langkah 2: Konfigurasi Database XAMPP
Buka file `.env` di root project menggunakan text editor Anda, pastikan konfigurasinya sesuai dengan akun MySQL XAMPP Anda. Konfigurasi default XAMPP tanpa password adalah sebagai berikut:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=firstaid_db
SESSION_SECRET=FirstAidSecretKeySuperS3cur3!
```

### Langkah 3: Menjalankan Server
1. Jalankan server dengan perintah:
   ```bash
   npm start
   ```
   atau jika ingin menggunakan nodemon untuk mode pengembangan (auto-reload saat kode diubah):
   ```bash
   npm run dev
   ```
2. Terminal akan menampilkan konfirmasi koneksi database berhasil dan server telah menyala:
   ```
   MySQL Server terhubung.
   Database 'firstaid_db' dipastikan ada.
   Tabel belum terbuat. Memulai migrasi database...
   Schema database berhasil diimpor.
   Data dummy berhasil dimasukkan.
   ===================================================
    FirstAid Guide Server berjalan aktif di:
    URL: http://localhost:3000
   ===================================================
   ```
3. Database `firstaid_db` beserta seluruh tabel dan 10 data dummy telah terbentuk secara otomatis di MySQL Anda.

### Langkah 4: Uji Coba Demo UAS di Browser
1. Buka browser Anda dan akses halaman utama di: **`http://localhost:3000`**
2. Coba fitur pencarian di beranda dengan mengetikkan: **`luka`** atau **`mimisan`**.
3. Buka halaman **Daftar Panduan**, klik filter kategori di kolom samping kiri untuk menyaring artikel.
4. Buka halaman **Kontak Darurat** untuk melihat nomor gawat darurat medis.
5. Akses halaman login dengan mengklik tombol **Login Admin** di pojok kanan atas.
6. Masuk menggunakan akun dummy berikut:
   - **Username:** `admin1`
   - **Password:** `admin123`
   *(Atau daftar akun admin baru melalui link pendaftaran di halaman tersebut)*
7. Jelajahi dashboard admin, buat data kategori baru, tambah artikel panduan dengan mengunggah gambar pendukung, ubah nomor kontak darurat, dan uji alur hapus data.
