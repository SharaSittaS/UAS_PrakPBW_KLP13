// Script utama frontend FirstAid Guide

// Konfirmasi hapus data untuk keamanan CRUD
document.addEventListener('DOMContentLoaded', () => {
  const deleteForms = document.querySelectorAll('.delete-form');
  deleteForms.forEach(form => {
    form.addEventListener('submit', (e) => {
      const isConfirmed = confirm('Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.');
      if (!isConfirmed) {
        e.preventDefault();
      }
    });
  });

  // Auto-dismiss alert setelah 4 detik
  const alerts = document.querySelectorAll('.alert-dismissible');
  alerts.forEach(alert => {
    setTimeout(() => {
      const bsAlert = bootstrap.Alert.getInstance(alert);
      if (bsAlert) {
        bsAlert.close();
      }
    }, 4000);
  });
});
