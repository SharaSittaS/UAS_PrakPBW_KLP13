const express = require('express');
const router = express.Router();
const { getPool } = require('../config/database');

// 1. Halaman Beranda (Home)
router.get('/', async (req, res) => {
  const db = getPool();
  try {
    // Ambil 6 panduan terbaru beserta nama kategorinya
    const [recentGuides] = await db.query(`
      SELECT g.*, c.nama as kategori_nama 
      FROM guides g 
      JOIN categories c ON g.kategori_id = c.id 
      ORDER BY g.created_at DESC 
      LIMIT 6
    `);

    // Ambil statistik ringkas untuk dipasang di Beranda
    const [[countGuides]] = await db.query('SELECT COUNT(*) as total FROM guides');
    const [[countCategories]] = await db.query('SELECT COUNT(*) as total FROM categories');
    const [[countContacts]] = await db.query('SELECT COUNT(*) as total FROM emergency_contacts');

    res.render('user/index', {
      title: 'FirstAid Guide - Panduan Pertolongan Pertama Gawat Darurat',
      guides: recentGuides,
      stats: {
        guides: countGuides.total,
        categories: countCategories.total,
        contacts: countContacts.total
      }
    });
  } catch (err) {
    // ERROR HANDLING : Error Halaman Beranda
    // Menangkap error jika query database gagal dan mengarahkan ke halaman 500.
    console.error(err);
    res.status(500).render('500', { error: err });
  }
});

// 2. Halaman Daftar Panduan (Search & Filter)
router.get('/guides', async (req, res) => {
  const db = getPool();
  const search = req.query.q || '';
  const categoryId = req.query.c || '';
  
  try {
    // Ambil semua kategori untuk filter dropdown/sidebar
    const [categories] = await db.query('SELECT * FROM categories ORDER BY nama ASC');

    // Bangun query dinamis berdasarkan input pencarian dan filter kategori
    let query = `
      SELECT g.*, c.nama as kategori_nama 
      FROM guides g 
      JOIN categories c ON g.kategori_id = c.id
    `;
    const queryParams = [];
    const conditions = [];

    if (search.trim() !== '') {
      conditions.push('(g.judul LIKE ? OR g.gejala LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (categoryId !== '') {
      conditions.push('g.kategori_id = ?');
      queryParams.push(categoryId);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY g.judul ASC';

    const [guides] = await db.query(query, queryParams);

    res.render('user/guides', {
      title: 'Daftar Panduan Pertolongan Pertama',
      guides,
      categories,
      search,
      selectedCategory: categoryId
    });
  } catch (err) {
    // ERROR HANDLING : Error Daftar Panduan
    // Menangkap error jika pencarian atau filter kategori gagal di database.
    console.error(err);
    res.status(500).render('500', { error: err });
  }
});

// 3. Halaman Detail Panduan
router.get('/guides/:id', async (req, res) => {
  const db = getPool();
  const guideId = req.params.id;

  try {
    const [guides] = await db.query(`
      SELECT g.*, c.nama as kategori_nama, u.nama as pembuat_nama 
      FROM guides g 
      JOIN categories c ON g.kategori_id = c.id 
      LEFT JOIN users u ON g.user_id = u.id 
      WHERE g.id = ?
    `, [guideId]);

    // ERROR HANDLING : Panduan Tidak Ditemukan (404)
    // Jika ID panduan yang dicari tidak ada di database, tampilkan halaman 404.
    if (guides.length === 0) {
      return res.status(404).render('404', { title: 'Panduan Tidak Ditemukan' });
    }

    const guide = guides[0];

    // Ambil rekomendasi panduan lain yang sejenis
    const [recommendations] = await db.query(`
      SELECT g.id, g.judul, g.gambar, c.nama as kategori_nama
      FROM guides g
      JOIN categories c ON g.kategori_id = c.id
      WHERE g.kategori_id = ? AND g.id != ?
      LIMIT 3
    `, [guide.kategori_id, guide.id]);

    res.render('user/detail', {
      title: `${guide.judul} - FirstAid Guide`,
      guide,
      recommendations
    });
  } catch (err) {
    // ERROR HANDLING : Error Detail Panduan
    // Menangkap error jika terjadi kegagalan query detail panduan.
    console.error(err);
    res.status(500).render('500', { error: err });
  }
});

// 4. Halaman Kontak Darurat
router.get('/contacts', async (req, res) => {
  const db = getPool();
  try {
    const [contacts] = await db.query('SELECT * FROM emergency_contacts ORDER BY nama_instansi ASC');
    res.render('user/contacts', {
      title: 'Nomor Kontak Darurat Medis & Penyelamatan',
      contacts
    });
  } catch (err) {
    // ERROR HANDLING : Error Halaman Kontak
    // Menangkap error jika pengambilan data kontak darurat gagal.
    console.error(err);
    res.status(500).render('500', { error: err });
  }
});

// 5. Halaman Tentang Aplikasi
router.get('/about', (req, res) => {
  res.render('user/about', {
    title: 'Tentang FirstAid Guide'
  });
});

module.exports = router;
