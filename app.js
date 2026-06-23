const express = require('express');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');
const { initDatabase } = require('./config/database');
const { injectSessionData } = require('./middlewares/auth');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Set view engine ke EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware pembaca request body (urlencoded & JSON)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Middleware untuk serving file statis (CSS, JS, Uploaded Images)
app.use(express.static(path.join(__dirname, 'public')));

// Konfigurasi Session Authentication
app.use(session({
  secret: process.env.SESSION_SECRET || 'FirstAidSecretKeySuperS3cur3!',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // Aktif selama 1 hari
    secure: false // Set true jika menggunakan HTTPS
  }
}));

// Inject data session (user & alert message) ke res.locals agar otomatis terbaca di semua template EJS
app.use(injectSessionData);

// ROUTING APLIKASI
// Import Routers
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const userRouter = require('./routes/user');

// Mapping URL Rute
app.use('/auth', authRouter);
app.use('/admin', adminRouter);
app.use('/', userRouter);

// ERROR HANDLING MIDDLEWARE (Penanganan Error Global)
// ERROR HANDLING  : Halaman Tidak Ditemukan (404)
// Fungsi ini menangani jika user mengakses URL/rute yang tidak terdaftar di sistem.
app.use((req, res, next) => {
  res.status(404).render('404', { title: 'Halaman Tidak Ditemukan - FirstAid' });
});

// ERROR HANDLING : Kesalahan Internal Server (500)
// Fungsi ini menangani jika terjadi crash/error pada sistem backend/database saat memproses permintaan.
app.use((err, req, res, next) => {
  console.error('Terjadi Kesalahan Internal:', err.stack);
  res.status(500).render('500', { 
    title: 'Terjadi Kesalahan Server - FirstAid',
    error: process.env.NODE_ENV === 'development' ? err : null
  });
});

// START SERVER & DATABASE INITIALIZATION
async function startServer() {
  console.log('Menghubungkan ke database...');
  await initDatabase(); // Otomatis cek, buat DB, dan import tabel jika belum ada
  
  app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(` FirstAid Guide Server berjalan aktif di:`);
    console.log(` URL: http://localhost:${PORT}`);
    console.log(`===================================================`);
  });
}

startServer();
