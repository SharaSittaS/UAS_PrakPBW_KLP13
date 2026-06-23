const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getPool } = require('../config/database');
const { isGuest } = require('../middlewares/auth');

// Rute Logout (di atas isGuest agar tidak diblokir jika user sudah login)
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
    }
    // Redirect ke halaman login setelah logout dengan pesan sukses
    res.redirect('/auth/login');
  });
});

// Gunakan middleware isGuest untuk rute login/register agar user yang sudah login tidak bisa membukanya
router.use(isGuest);

// Halaman Register
router.get('/register', (req, res) => {
  res.render('auth/register', { title: 'Daftar Akun Admin' });
});

// Proses Register
router.post('/register', async (req, res) => {
  const { username, password, confirm_password, nama } = req.body;
  const db = getPool();

  // ERROR HANDLING : Validasi Input Registrasi
  // Mengecek apakah input kosong, password kurang dari 6 karakter, atau konfirmasi password tidak cocok.
  if (!username || !password || !confirm_password || !nama) {
    req.session.message = { type: 'danger', text: 'Semua field wajib diisi.' };
    return res.redirect('/auth/register');
  }

  if (password.length < 6) {
    req.session.message = { type: 'danger', text: 'Password minimal harus 6 karakter.' };
    return res.redirect('/auth/register');
  }

  if (password !== confirm_password) {
    req.session.message = { type: 'danger', text: 'Konfirmasi password tidak cocok.' };
    return res.redirect('/auth/register');
  }

  try {
    // 2. Cek apakah username sudah terdaftar
    const [existingUsers] = await db.query('SELECT id FROM users WHERE username = ?', [username.trim()]);
    if (existingUsers.length > 0) {
      req.session.message = { type: 'danger', text: 'Username sudah digunakan.' };
      return res.redirect('/auth/register');
    }

    // 3. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Simpan ke database
    await db.query(
      'INSERT INTO users (username, password, nama) VALUES (?, ?, ?)',
      [username.trim().toLowerCase(), hashedPassword, nama.trim()]
    );

    req.session.message = { type: 'success', text: 'Registrasi berhasil! Silakan login.' };
    return res.redirect('/auth/login');
  } catch (err) {
    // ERROR HANDLING : Error Proses Registrasi
    // Menangkap error jika penyimpanan user baru ke database gagal (misal duplikasi username).
    console.error(err);
    req.session.message = { type: 'danger', text: 'Terjadi kesalahan sistem saat registrasi.' };
    return res.redirect('/auth/register');
  }
});

// Halaman Login
router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Masuk Admin' });
});

// Proses Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const db = getPool();

  // ERROR HANDLING : Validasi Input & Autentikasi Login
  // Memeriksa kelengkapan input username/password, keberadaan user di database, dan kecocokan password.
  if (!username || !password) {
    req.session.message = { type: 'danger', text: 'Username dan password wajib diisi.' };
    return res.redirect('/auth/login');
  }

  try {
    // 1. Cari user di database
    const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username.trim().toLowerCase()]);
    if (users.length === 0) {
      req.session.message = { type: 'danger', text: 'Username tidak ditemukan.' };
      return res.redirect('/auth/login');
    }

    const user = users[0];

    // 2. Verifikasi password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.session.message = { type: 'danger', text: 'Password salah.' };
      return res.redirect('/auth/login');
    }

    // 3. Simpan session user
    req.session.user = {
      id: user.id,
      username: user.username,
      nama: user.nama
    };

    req.session.message = { type: 'success', text: `Selamat datang kembali, ${user.nama}!` };
    return res.redirect('/admin/dashboard');
  } catch (err) {
    // ERROR HANDLING : Error Proses Login
    // Menangkap error jika terjadi crash koneksi atau masalah sistem saat login.
    console.error(err);
    req.session.message = { type: 'danger', text: 'Terjadi kesalahan sistem saat login.' };
    return res.redirect('/auth/login');
  }
});

module.exports = router;
