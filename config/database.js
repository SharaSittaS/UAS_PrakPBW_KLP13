const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true // untuk mengeksekusi file SQL utuh
};

// Buat pool koneksi utama (akan ditunjuk ke database setelah dibuat)
let pool;

async function initDatabase() {
  try {
    // 1. Koneksi pertama ke MySQL tanpa memilih database
    const connection = await mysql.createConnection(dbConfig);
    console.log('MySQL Server terhubung.');

    // 2. Buat database jika belum ada
    const dbName = process.env.DB_NAME || 'firstaid_db';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    console.log(`Database '${dbName}' dipastikan ada.`);
    await connection.end();

    // 3. Inisialisasi Pool utama dengan database terpilih
    pool = mysql.createPool({
      ...dbConfig,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // 4. Periksa apakah tabel 'users' sudah ada
    const [rows] = await pool.query(`SHOW TABLES LIKE 'users'`);
    if (rows.length === 0) {
      console.log('Tabel belum terbuat. Memulai migrasi database...');
      
      // Baca file schema.sql dan seed.sql
      const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
      const seedPath = path.join(__dirname, '..', 'database', 'seed.sql');

      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await pool.query(schemaSql);
        console.log('Schema database berhasil diimpor.');
      }

      if (fs.existsSync(seedPath)) {
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        await pool.query(seedSql);
        console.log('Data dummy berhasil dimasukkan.');
      }
    } else {
      console.log('Tabel database sudah ada, melompati migrasi.');
    }
  } catch (err) {
    // ERROR HANDLING : Gagal Koneksi Database
    // Menangani error jika server MySQL/XAMPP belum dinyalakan atau konfigurasi .env salah.
    console.error('Gagal melakukan inisialisasi database:', err.message);
    console.error('TIPS: Pastikan XAMPP (MySQL) sudah AKTIF sebelum menjalankan aplikasi!');
    process.exit(1);
  }
}

// Ekspor pool dan fungsi inisialisasi
module.exports = {
  getPool: () => {
    if (!pool) {
      // Fallback jika dipanggil sebelum initDatabase selesai
      pool = mysql.createPool({
        ...dbConfig,
        database: process.env.DB_NAME || 'firstaid_db'
      });
    }
    return pool;
  },
  initDatabase
};
