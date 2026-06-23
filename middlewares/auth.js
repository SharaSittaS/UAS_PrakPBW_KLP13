// Middleware untuk mengecek apakah user sudah login
function isLoggedIn(req, res, next) {
  if (req.session && req.session.user) {
    // Inject user info ke all views
    res.locals.user = req.session.user;
    return next();
  }
  
  // Set return url jika perlu
  req.session.message = {
    type: 'danger',
    text: 'Silakan login terlebih dahulu untuk mengakses halaman tersebut.'
  };
  res.redirect('/auth/login');
}

// Middleware untuk mengecek apakah user adalah guest (belum login)
function isGuest(req, res, next) {
  if (!req.session || !req.session.user) {
    return next();
  }
  res.redirect('/admin/dashboard');
}

// Global middleware untuk inject data session ke template EJS
function injectSessionData(req, res, next) {
  res.locals.user = req.session ? req.session.user : null;
  res.locals.message = req.session ? req.session.message : null;
  
  // Clear message setelah dirender agar tidak berulang
  if (req.session) {
    req.session.message = null;
  }
  next();
}

module.exports = {
  isLoggedIn,
  isGuest,
  injectSessionData
};
