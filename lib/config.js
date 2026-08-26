// File Konfigurasi Terpusat Web App NFC & QR
export const SITE_CONFIG = {
  // 1. BRANDING UTAMA
  brandName: "Google Review NFC by shndf1re",
  domainUrl: "https://nfc-review-shndf1re.vercel.app", // Domain Vercel / Custom Domain Anda
  supportWhatsapp: "6285156534909", // Nomor WA Support (Format 62...)

  // 2. GAMBAR & LOGO
  // Logo di tengah QR Code (Format PNG/SVG Transparan disarankan)
  qrLogoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg",

  // 3. TEKS HALAMAN ADMIN PORTAL (/admin)
  adminTitle: "Dashboard NFC",
  adminSubtitle: "Sistem Manajemen Perangkat & QR",

  // 4. TEKS HALAMAN SETUP / AKTIVASI PEMBELI (/setup/[id])
  setupTitle: "Aktivasi Papan Akrilik NFC & QR",
  setupSubtitle: "Hubungkan kartu Anda langsung ke halaman Google Review toko dalam 1 menit.",
  setupInstruction: "Masukkan PIN 6-digit yang tertera pada paket pembelian dan tempelkan link Google Review toko Anda di bawah ini.",
  setupSuccessTitle: "🎉 Papan Akrilik Berhasil Diaktifkan!",
  setupSuccessMessage: "Kartu NFC dan QR Code Anda sudah terhubung secara permanen ke ulasan Google Review toko Anda.",

  // 5. TEKS HALAMAN STATISTIK (/admin/stats)
  statsTitle: "📊 Statistik Pemakaian",
  statsSubtitle: "Analisis Tap NFC vs Scan QR Code Per Kartu"
};
