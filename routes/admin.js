const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getPool } = require('../config/database');
const { isLoggedIn } = require('../middlewares/auth');

// middleware isLoggedIn untuk memproteksi semua rute admin
router.use(isLoggedIn);

// Konfigurasi Multer untuk Upload Gambar
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = 'public/uploads/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname).toLowerCase());
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // Batas 2MB
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Format file tidak didukung! Hanya gambar JPEG, JPG, PNG, atau WEBP.'));
  }
});

// 1. DASHBOARD ADMIN
router.get('/dashboard', async (req, res) => {
  const db = getPool();
  try {
    const [[countGuides]] = await db.query('SELECT COUNT(*) as total FROM guides');
    const [[countCategories]] = await db.query('SELECT COUNT(*) as total FROM categories');
    const [[countContacts]] = await db.query('SELECT COUNT(*) as total FROM emergency_contacts');
    
    // Ambil 5 panduan terakhir untuk log aktivitas
    const [recentGuides] = await db.query(`
      SELECT g.id, g.judul, c.nama as kategori_nama, g.created_at 
      FROM guides g 
      JOIN categories c ON g.kategori_id = c.id 
      ORDER BY g.created_at DESC 
      LIMIT 5
    `);

    res.render('admin/dashboard', {
      title: 'Dashboard Admin - FirstAid Guide',
      stats: {
        guides: countGuides.total,
        categories: countCategories.total,
        contacts: countContacts.total
      },
      recentGuides
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('500', { error: err });
  }
});

// 2. CRUD KATEGORI (CATEGORIES)
// Tampil List Kategori
router.get('/categories', async (req, res) => {
  const db = getPool();
  try {
    const [categories] = await db.query(`
      SELECT c.*, u.nama as pembuat_nama 
      FROM categories c 
      LEFT JOIN users u ON c.user_id = u.id 
      ORDER BY c.nama ASC
    `);
    res.render('admin/categories/index', { title: 'Manajemen Kategori', categories });
  } catch (err) {
    console.error(err);
    res.status(500).render('500', { error: err });
  }
});

// Form Tambah Kategori
router.get('/categories/create', (req, res) => {
  res.render('admin/categories/create', { title: 'Tambah Kategori Baru' });
});

// Proses Tambah Kategori
router.post('/categories/create', async (req, res) => {
  const { nama, deskripsi } = req.body;
  const db = getPool();

  if (!nama) {
    req.session.message = { type: 'danger', text: 'Nama kategori wajib diisi.' };
    return res.redirect('/admin/categories/create');
  }

  try {
    await db.query(
      'INSERT INTO categories (nama, deskripsi, user_id) VALUES (?, ?, ?)',
      [nama.trim(), deskripsi.trim(), req.session.user.id]
    );
    req.session.message = { type: 'success', text: 'Kategori berhasil ditambahkan!' };
    res.redirect('/admin/categories');
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Gagal menambahkan kategori. Nama kategori mungkin sudah terdaftar.' };
    res.redirect('/admin/categories/create');
  }
});

// Form Edit Kategori
router.get('/categories/edit/:id', async (req, res) => {
  const db = getPool();
  try {
    const [categories] = await db.query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (categories.length === 0) {
      req.session.message = { type: 'danger', text: 'Kategori tidak ditemukan.' };
      return res.redirect('/admin/categories');
    }
    res.render('admin/categories/edit', { title: 'Edit Kategori', category: categories[0] });
  } catch (err) {
    console.error(err);
    res.status(500).render('500', { error: err });
  }
});

// Proses Edit Kategori
router.post('/categories/edit/:id', async (req, res) => {
  const { nama, deskripsi } = req.body;
  const db = getPool();

  if (!nama) {
    req.session.message = { type: 'danger', text: 'Nama kategori wajib diisi.' };
    return res.redirect(`/admin/categories/edit/${req.params.id}`);
  }

  try {
    await db.query(
      'UPDATE categories SET nama = ?, deskripsi = ?, user_id = ? WHERE id = ?',
      [nama.trim(), deskripsi.trim(), req.session.user.id, req.params.id]
    );
    req.session.message = { type: 'success', text: 'Kategori berhasil diperbarui!' };
    res.redirect('/admin/categories');
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Gagal memperbarui kategori.' };
    res.redirect(`/admin/categories/edit/${req.params.id}`);
  }
});

// Hapus Kategori
router.post('/categories/delete/:id', async (req, res) => {
  const db = getPool();
  try {
    await db.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    req.session.message = { type: 'success', text: 'Kategori berhasil dihapus!' };
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Gagal menghapus kategori. Kategori ini mungkin masih digunakan oleh data panduan.' };
  }
  res.redirect('/admin/categories');
});


// 3. CRUD KONTAK DARURAT (EMERGENCY CONTACTS)
// Tampil List Kontak
router.get('/contacts', async (req, res) => {
  const db = getPool();
  try {
    const [contacts] = await db.query(`
      SELECT ec.*, u.nama as pembuat_nama 
      FROM emergency_contacts ec 
      LEFT JOIN users u ON ec.user_id = u.id 
      ORDER BY ec.nama_instansi ASC
    `);
    res.render('admin/contacts/index', { title: 'Manajemen Kontak Darurat', contacts });
  } catch (err) {
    console.error(err);
    res.status(500).render('500', { error: err });
  }
});

// Form Tambah Kontak
router.get('/contacts/create', (req, res) => {
  res.render('admin/contacts/create', { title: 'Tambah Kontak Darurat' });
});

// Proses Tambah Kontak
router.post('/contacts/create', async (req, res) => {
  const { nama_instansi, nomor_telepon, alamat, keterangan } = req.body;
  const db = getPool();

  if (!nama_instansi || !nomor_telepon) {
    req.session.message = { type: 'danger', text: 'Nama instansi dan nomor telepon wajib diisi.' };
    return res.redirect('/admin/contacts/create');
  }

  try {
    await db.query(
      'INSERT INTO emergency_contacts (nama_instansi, nomor_telepon, alamat, keterangan, user_id) VALUES (?, ?, ?, ?, ?)',
      [nama_instansi.trim(), nomor_telepon.trim(), alamat.trim(), keterangan.trim(), req.session.user.id]
    );
    req.session.message = { type: 'success', text: 'Kontak darurat berhasil ditambahkan!' };
    res.redirect('/admin/contacts');
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Gagal menambahkan kontak darurat.' };
    res.redirect('/admin/contacts/create');
  }
});

// Form Edit Kontak
router.get('/contacts/edit/:id', async (req, res) => {
  const db = getPool();
  try {
    const [contacts] = await db.query('SELECT * FROM emergency_contacts WHERE id = ?', [req.params.id]);
    if (contacts.length === 0) {
      req.session.message = { type: 'danger', text: 'Kontak darurat tidak ditemukan.' };
      return res.redirect('/admin/contacts');
    }
    res.render('admin/contacts/edit', { title: 'Edit Kontak Darurat', contact: contacts[0] });
  } catch (err) {
    console.error(err);
    res.status(500).render('500', { error: err });
  }
});

// Proses Edit Kontak
router.post('/contacts/edit/:id', async (req, res) => {
  const { nama_instansi, nomor_telepon, alamat, keterangan } = req.body;
  const db = getPool();

  if (!nama_instansi || !nomor_telepon) {
    req.session.message = { type: 'danger', text: 'Nama instansi dan nomor telepon wajib diisi.' };
    return res.redirect(`/admin/contacts/edit/${req.params.id}`);
  }

  try {
    await db.query(
      'UPDATE emergency_contacts SET nama_instansi = ?, nomor_telepon = ?, alamat = ?, keterangan = ?, user_id = ? WHERE id = ?',
      [nama_instansi.trim(), nomor_telepon.trim(), alamat.trim(), keterangan.trim(), req.session.user.id, req.params.id]
    );
    req.session.message = { type: 'success', text: 'Kontak darurat berhasil diperbarui!' };
    res.redirect('/admin/contacts');
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Gagal memperbarui kontak darurat.' };
    res.redirect(`/admin/contacts/edit/${req.params.id}`);
  }
});

// Hapus Kontak
router.post('/contacts/delete/:id', async (req, res) => {
  const db = getPool();
  try {
    await db.query('DELETE FROM emergency_contacts WHERE id = ?', [req.params.id]);
    req.session.message = { type: 'success', text: 'Kontak darurat berhasil dihapus!' };
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Gagal menghapus kontak darurat.' };
  }
  res.redirect('/admin/contacts');
});


// 4. CRUD PANDUAN (GUIDES)
// Tampil List Panduan
router.get('/guides', async (req, res) => {
  const db = getPool();
  try {
    const [guides] = await db.query(`
      SELECT g.*, c.nama as kategori_nama, u.nama as pembuat_nama 
      FROM guides g 
      JOIN categories c ON g.kategori_id = c.id 
      LEFT JOIN users u ON g.user_id = u.id 
      ORDER BY g.created_at DESC
    `);
    res.render('admin/guides/index', { title: 'Manajemen Panduan', guides });
  } catch (err) {
    console.error(err);
    res.status(500).render('500', { error: err });
  }
});

// Form Tambah Panduan
router.get('/guides/create', async (req, res) => {
  const db = getPool();
  try {
    const [categories] = await db.query('SELECT * FROM categories ORDER BY nama ASC');
    res.render('admin/guides/create', { title: 'Tambah Panduan Baru', categories });
  } catch (err) {
    console.error(err);
    res.status(500).render('500', { error: err });
  }
});

// Proses Tambah Panduan (Menggunakan Multer)
router.post('/guides/create', (req, res) => {
  // Wrap upload handler untuk penanganan error Multer
  upload.single('gambar')(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      req.session.message = { type: 'danger', text: `Error upload file: ${err.message}` };
      return res.redirect('/admin/guides/create');
    } else if (err) {
      req.session.message = { type: 'danger', text: err.message };
      return res.redirect('/admin/guides/create');
    }

    const { judul, kategori_id, gejala, langkah_penanganan } = req.body;
    const db = getPool();

    if (!judul || !kategori_id || !gejala || !langkah_penanganan) {
      // Hapus file yang baru diunggah jika validasi gagal
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      req.session.message = { type: 'danger', text: 'Semua kolom formulir wajib diisi.' };
      return res.redirect('/admin/guides/create');
    }

    const gambarFilename = req.file ? req.file.filename : null;

    try {
      await db.query(
        'INSERT INTO guides (judul, kategori_id, gejala, langkah_penanganan, gambar, user_id) VALUES (?, ?, ?, ?, ?, ?)',
        [judul.trim(), kategori_id, gejala.trim(), langkah_penanganan.trim(), gambarFilename, req.session.user.id]
      );
      req.session.message = { type: 'success', text: 'Panduan baru berhasil disimpan!' };
      res.redirect('/admin/guides');
    } catch (dbErr) {
      console.error(dbErr);
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      req.session.message = { type: 'danger', text: 'Gagal menyimpan panduan ke database.' };
      res.redirect('/admin/guides/create');
    }
  });
});

// Form Edit Panduan
router.get('/guides/edit/:id', async (req, res) => {
  const db = getPool();
  try {
    const [guides] = await db.query('SELECT * FROM guides WHERE id = ?', [req.params.id]);
    if (guides.length === 0) {
      req.session.message = { type: 'danger', text: 'Panduan tidak ditemukan.' };
      return res.redirect('/admin/guides');
    }
    const [categories] = await db.query('SELECT * FROM categories ORDER BY nama ASC');
    res.render('admin/guides/edit', { 
      title: 'Edit Panduan', 
      guide: guides[0], 
      categories 
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('500', { error: err });
  }
});

// Proses Edit Panduan (Menggunakan Multer)
router.post('/guides/edit/:id', (req, res) => {
  upload.single('gambar')(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      req.session.message = { type: 'danger', text: `Error upload file: ${err.message}` };
      return res.redirect(`/admin/guides/edit/${req.params.id}`);
    } else if (err) {
      req.session.message = { type: 'danger', text: err.message };
      return res.redirect(`/admin/guides/edit/${req.params.id}`);
    }

    const { judul, kategori_id, gejala, langkah_penanganan } = req.body;
    const db = getPool();

    if (!judul || !kategori_id || !gejala || !langkah_penanganan) {
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      req.session.message = { type: 'danger', text: 'Semua kolom formulir wajib diisi.' };
      return res.redirect(`/admin/guides/edit/${req.params.id}`);
    }

    try {
      // Dapatkan data panduan lama untuk cek gambar lama
      const [oldGuides] = await db.query('SELECT gambar FROM guides WHERE id = ?', [req.params.id]);
      if (oldGuides.length === 0) {
        if (req.file) fs.unlinkSync(req.file.path);
        req.session.message = { type: 'danger', text: 'Panduan tidak ditemukan.' };
        return res.redirect('/admin/guides');
      }

      const oldImage = oldGuides[0].gambar;
      let newImage = oldImage;

      if (req.file) {
        newImage = req.file.filename;
        // Hapus gambar lama jika ada dan bukan gambar bawaan/kosong
        if (oldImage) {
          const oldImagePath = path.join('public', 'uploads', oldImage);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
      }

      await db.query(
        'UPDATE guides SET judul = ?, kategori_id = ?, gejala = ?, langkah_penanganan = ?, gambar = ?, user_id = ? WHERE id = ?',
        [judul.trim(), kategori_id, gejala.trim(), langkah_penanganan.trim(), newImage, req.session.user.id, req.params.id]
      );

      req.session.message = { type: 'success', text: 'Panduan berhasil diperbarui!' };
      res.redirect('/admin/guides');
    } catch (dbErr) {
      console.error(dbErr);
      if (req.file) fs.unlinkSync(req.file.path);
      req.session.message = { type: 'danger', text: 'Gagal memperbarui panduan.' };
      res.redirect(`/admin/guides/edit/${req.params.id}`);
    }
  });
});

// Hapus Panduan
router.post('/guides/delete/:id', async (req, res) => {
  const db = getPool();
  try {
    // Cari nama gambar dulu sebelum data dihapus dari database
    const [guides] = await db.query('SELECT gambar FROM guides WHERE id = ?', [req.params.id]);
    
    if (guides.length > 0) {
      const image = guides[0].gambar;
      if (image) {
        const imagePath = path.join('public', 'uploads', image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }
    }

    await db.query('DELETE FROM guides WHERE id = ?', [req.params.id]);
    req.session.message = { type: 'success', text: 'Panduan berhasil dihapus!' };
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'danger', text: 'Gagal menghapus panduan.' };
  }
  res.redirect('/admin/guides');
});

module.exports = router;
